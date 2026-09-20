import "server-only";

import { NextResponse } from "next/server";
import { getPublicCommentUser } from "@/features/public-comment/minpaku/server/auth";
import { sendPublicCommentReceipt } from "@/features/public-comment/minpaku/server/receipt";
import {
  completeSession,
  findCampaign,
  findDraft,
  findSessionForCampaignUser,
} from "@/features/public-comment/minpaku/server/repository";
import {
  PUBLIC_COMMENT_CONSENT_VERSION,
  PUBLIC_COMMENT_EVENT_INVITATION_CONSENT_VERSION,
} from "@/features/public-comment/minpaku/shared/consent";
import type { PublicCommentReceipt } from "@/features/public-comment/minpaku/shared/receipt";
import type { PublicCommentEventInvitationResult } from "../event-invitation";
import { sendPublicCommentEventInvitation } from "./event-invitation";
import {
  PUBLIC_COMMENT_EVENT_INVITATION_HTML,
  PUBLIC_COMMENT_EVENT_INVITATION_SUBJECT,
  PUBLIC_COMMENT_EVENT_INVITATION_TEXT,
} from "./event-invitation-email";

export function createPublicCommentCompleteHandler(campaignSlug: string) {
  return async function POST(request: Request) {
    const body = await request.json().catch(() => null);
    const sessionId = typeof body?.sessionId === "string" ? body.sessionId : "";
    if (!sessionId)
      return NextResponse.json(
        { error: "sessionIdが必要です" },
        { status: 400 }
      );
    if (
      body.publicationRequested !== false ||
      typeof body.receiptOptIn !== "boolean" ||
      body.consentVersion !== PUBLIC_COMMENT_CONSENT_VERSION
    )
      return NextResponse.json(
        { error: "最新の同意事項を確認してください" },
        { status: 400 }
      );

    const eventInvitationOptIn = body.eventInvitationOptIn === true;

    const user = await getPublicCommentUser();
    if (!user)
      return NextResponse.json(
        { error: "Googleログインが必要です" },
        { status: 401 }
      );

    try {
      const campaign = await findCampaign(campaignSlug);
      if (!campaign)
        return NextResponse.json(
          { error: "キャンペーンが見つかりません" },
          { status: 404 }
        );
      const session = await findSessionForCampaignUser(
        sessionId,
        user.id,
        campaign.id
      );
      if (!session)
        return NextResponse.json(
          { error: "セッションが見つかりません" },
          { status: 404 }
        );
      const draft = await findDraft(sessionId);
      if (!draft?.final_body?.trim())
        return NextResponse.json(
          { error: "下書きを確認してから完了してください" },
          { status: 400 }
        );
      let status: string;
      try {
        // A response can be lost after the database commit, especially in an
        // embedded browser. Retrying must not turn a completed session into a
        // generic 500 error.
        status = session.completed_at
          ? (session.publication_status ?? "private")
          : await completeSession({
              sessionId,
              userId: user.id,
              publicationRequested: false,
              receiptOptIn: body.receiptOptIn,
              consentVersion: body.consentVersion,
              eventInvitationOptIn,
              eventInvitationConsentVersion: eventInvitationOptIn
                ? PUBLIC_COMMENT_EVENT_INVITATION_CONSENT_VERSION
                : null,
              eventInvitationEmail: eventInvitationOptIn
                ? {
                    subject: PUBLIC_COMMENT_EVENT_INVITATION_SUBJECT,
                    body: PUBLIC_COMMENT_EVENT_INVITATION_TEXT,
                    html: PUBLIC_COMMENT_EVENT_INVITATION_HTML,
                  }
                : null,
            });
      } catch (error) {
        const completedSession = await findSessionForCampaignUser(
          sessionId,
          user.id,
          campaign.id
        );
        if (!completedSession?.completed_at) throw error;
        status = completedSession.publication_status ?? "private";
      }
      const receiptPromise: Promise<PublicCommentReceipt> = body.receiptOptIn
        ? sendPublicCommentReceipt(sessionId, user.id).catch(() => ({
            status: "pending",
            canRetry: true,
          }))
        : Promise.resolve({ status: "not_requested", canRetry: false });
      const eventInvitationPromise: Promise<PublicCommentEventInvitationResult> =
        eventInvitationOptIn
          ? sendPublicCommentEventInvitation(sessionId, user.id).catch(() => ({
              status: "pending",
              canRetry: true,
            }))
          : Promise.resolve({ status: "not_requested", canRetry: false });
      const [receipt, eventInvitation] = await Promise.all([
        receiptPromise,
        eventInvitationPromise,
      ]);
      return NextResponse.json({ status, receipt, eventInvitation });
    } catch {
      console.warn("public_comment_completion_failed");
      return NextResponse.json(
        { error: "完了処理に失敗しました" },
        { status: 500 }
      );
    }
  };
}

export function createPublicCommentEventInvitationHandler(
  campaignSlug: string
) {
  return async function POST(request: Request) {
    const body = await request.json().catch(() => null);
    if (typeof body?.sessionId !== "string" || !body.sessionId)
      return NextResponse.json(
        { error: "sessionIdが必要です" },
        { status: 400 }
      );

    const user = await getPublicCommentUser();
    if (!user)
      return NextResponse.json(
        { error: "Googleログインが必要です" },
        { status: 401 }
      );

    try {
      const campaign = await findCampaign(campaignSlug);
      if (!campaign)
        return NextResponse.json(
          { error: "キャンペーンが見つかりません" },
          { status: 404 }
        );
      const session = await findSessionForCampaignUser(
        body.sessionId,
        user.id,
        campaign.id
      );
      if (!session)
        return NextResponse.json(
          { error: "セッションが見つかりません" },
          { status: 404 }
        );
      if (!session.completed_at)
        return NextResponse.json(
          { error: "インタビューを完了してください" },
          { status: 409 }
        );
      return NextResponse.json({
        eventInvitation: await sendPublicCommentEventInvitation(
          session.id,
          user.id
        ),
      });
    } catch {
      console.warn("public_comment_event_invitation_retry_failed");
      return NextResponse.json(
        { error: "イベント案内メールの状態を確認できませんでした" },
        { status: 500 }
      );
    }
  };
}

export function createPublicCommentReceiptHandler(campaignSlug: string) {
  return async function POST(request: Request) {
    const body = await request.json().catch(() => null);
    if (typeof body?.sessionId !== "string" || !body.sessionId)
      return NextResponse.json(
        { error: "sessionIdが必要です" },
        { status: 400 }
      );

    const user = await getPublicCommentUser();
    if (!user)
      return NextResponse.json(
        { error: "Googleログインが必要です" },
        { status: 401 }
      );

    try {
      const campaign = await findCampaign(campaignSlug);
      if (!campaign)
        return NextResponse.json(
          { error: "キャンペーンが見つかりません" },
          { status: 404 }
        );
      const session = await findSessionForCampaignUser(
        body.sessionId,
        user.id,
        campaign.id
      );
      if (!session)
        return NextResponse.json(
          { error: "セッションが見つかりません" },
          { status: 404 }
        );
      if (!session.completed_at)
        return NextResponse.json(
          { error: "インタビューを完了してください" },
          { status: 409 }
        );
      return NextResponse.json({
        receipt: await sendPublicCommentReceipt(session.id, user.id),
      });
    } catch {
      console.warn("public_comment_receipt_retry_failed");
      return NextResponse.json(
        { error: "控えメールの状態を確認できませんでした" },
        { status: 500 }
      );
    }
  };
}
