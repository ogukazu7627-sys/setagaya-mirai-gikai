"use client";

import { Send } from "lucide-react";
import Image from "next/image";
import { useActionState, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { saveReportRecipients } from "@/features/councilor-digest/server/actions/save-report-recipients";
import type {
  CouncilorRecipientCandidate,
  ReportRecipientSelection,
  SaveReportRecipientsResult,
} from "@/features/councilor-digest/shared/types";
import { getInterviewReportCompleteLink } from "@/features/interview-config/shared/utils/interview-links";
import { InterviewPublicConsentModal } from "@/features/interview-report/client/components/interview-public-consent-modal";
import { updatePublicSetting } from "@/features/interview-report/server/actions/update-public-setting";

type CompletionPhase = "idle" | "flying" | "done";

const INITIAL_STATE: SaveReportRecipientsResult = {
  success: false,
  message: "",
};

type InterviewRecipientSelectionStepProps = {
  sessionId: string;
  reportId: string;
  selection: ReportRecipientSelection;
};

export function InterviewRecipientSelectionStep({
  sessionId,
  reportId,
  selection,
}: InterviewRecipientSelectionStepProps) {
  const [state, formAction, isPending] = useActionState(
    saveReportRecipients,
    INITIAL_STATE
  );
  const [selectedCouncilorId, setSelectedCouncilorId] = useState("");
  const [submittedCandidate, setSubmittedCandidate] =
    useState<CouncilorRecipientCandidate | null>(null);
  const [completionPhase, setCompletionPhase] =
    useState<CompletionPhase>("idle");
  const [isPublicModalOpen, setIsPublicModalOpen] = useState(false);
  const [isPublicSubmitting, setIsPublicSubmitting] = useState(false);
  const [publicSettingError, setPublicSettingError] = useState<string | null>(
    null
  );

  const selectedCandidate = useMemo(
    () =>
      selection.candidates.find(
        (candidate) => candidate.id === selectedCouncilorId
      ) ?? null,
    [selectedCouncilorId, selection.candidates]
  );
  const hasCandidates = selection.candidates.length > 0;
  const acceptedCandidate =
    completionPhase === "done" && state.success ? submittedCandidate : null;

  useEffect(() => {
    if (completionPhase !== "flying" || isPending || !state.message) {
      return;
    }

    if (!state.success) {
      setCompletionPhase("idle");
      return;
    }

    const doneTimer = window.setTimeout(() => {
      setCompletionPhase("done");
    }, 650);
    const modalTimer = window.setTimeout(() => {
      setIsPublicModalOpen(true);
    }, 1150);

    return () => {
      window.clearTimeout(doneTimer);
      window.clearTimeout(modalTimer);
    };
  }, [completionPhase, isPending, state.message, state.success]);

  const handlePublicSubmit = async (isPublic: boolean) => {
    setIsPublicSubmitting(true);
    setPublicSettingError(null);
    try {
      const result = await updatePublicSetting(sessionId, isPublic);
      if (!result.success) {
        setPublicSettingError(result.error ?? "公開設定の更新に失敗しました。");
        setIsPublicSubmitting(false);
        return;
      }
      window.location.href = getInterviewReportCompleteLink(reportId);
    } catch (error) {
      setPublicSettingError(
        error instanceof Error
          ? error.message
          : "公開設定の更新に失敗しました。"
      );
      setIsPublicSubmitting(false);
    }
  };

  return (
    <section className="rounded-2xl border border-primary/20 bg-white px-4 py-4 shadow-sm">
      <div className="flex flex-col gap-4">
        <div className="space-y-1">
          <h3 className="text-base font-bold text-mirai-text">
            誰にこの意見を伝えますか？
          </h3>
          <p className="text-xs font-bold leading-[1.8] text-mirai-text-secondary">
            この案件を担当する委員会の議員から1人選んでください。
          </p>
        </div>

        {!hasCandidates ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold leading-[1.8] text-amber-800">
            この案件では委員会メンバー候補を確認できませんでした。管理画面で委員会情報を確認してください。
          </p>
        ) : acceptedCandidate ? (
          <div className="flex flex-col gap-4">
            <div className="animate-fade-in flex items-center gap-3 rounded-xl border border-primary/20 bg-mirai-gradient px-4 py-4">
              {acceptedCandidate.iconUrl ? (
                <Image
                  src={acceptedCandidate.iconUrl}
                  alt=""
                  width={48}
                  height={48}
                  className="size-12 shrink-0 rounded-full object-cover"
                />
              ) : (
                <span className="grid size-12 shrink-0 place-items-center rounded-full bg-white/70 text-xs text-mirai-text-secondary">
                  顔写真
                </span>
              )}
              <p className="text-sm font-bold leading-[1.7] text-mirai-text">
                {acceptedCandidate.displayName}
                議員への提出が完了しました。
              </p>
            </div>
            <Button
              type="button"
              onClick={() => setIsPublicModalOpen(true)}
              disabled={isPublicSubmitting}
              className="w-full"
            >
              このインタビュー結果の公開設定へ進む
            </Button>
          </div>
        ) : (
          <form
            action={formAction}
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              if (!selectedCandidate) {
                event.preventDefault();
                return;
              }
              setSubmittedCandidate(selectedCandidate);
              setCompletionPhase("flying");
            }}
          >
            <input type="hidden" name="report_id" value={reportId} />
            <div className="grid max-h-64 gap-2 overflow-y-auto overscroll-contain rounded-xl border border-gray-200 p-2 touch-pan-y">
              {selection.candidates.map((candidate) => (
                <CouncilorRadioCard
                  key={candidate.id}
                  candidate={candidate}
                  checked={candidate.id === selectedCouncilorId}
                  disabled={
                    selection.alreadySentCouncilorIds.includes(candidate.id) ||
                    isPending ||
                    completionPhase !== "idle"
                  }
                  onChange={setSelectedCouncilorId}
                />
              ))}
            </div>

            <label className="flex items-start gap-3 rounded-xl border border-gray-200 bg-mirai-surface px-3 py-3 text-xs font-bold leading-[1.7] text-mirai-text">
              <input
                type="checkbox"
                name="share_contact"
                defaultChecked={selection.shareContact}
                className="mt-1 size-4"
              />
              <span>
                議員向けレポートにGoogleアカウントの名前・メールアドレスを含めることに同意します。
              </span>
            </label>

            {state.message && !state.success && (
              <p
                className={`rounded-xl border px-3 py-2 text-xs font-bold leading-[1.7] ${
                  state.success
                    ? "border-green-200 bg-green-50 text-green-700"
                    : "border-red-200 bg-red-50 text-red-700"
                }`}
              >
                {state.message}
              </p>
            )}

            <Button
              type="submit"
              disabled={
                isPending || !selectedCouncilorId || completionPhase !== "idle"
              }
              className="w-full overflow-hidden"
            >
              <Send
                className={`size-5 ${
                  completionPhase === "flying"
                    ? "animate-paper-plane-flight"
                    : ""
                }`}
              />
              {isPending || completionPhase === "flying"
                ? "送信しています..."
                : "この議員に伝える"}
            </Button>
          </form>
        )}

        {publicSettingError && (
          <p className="text-xs font-bold text-red-600">{publicSettingError}</p>
        )}
      </div>

      <InterviewPublicConsentModal
        open={isPublicModalOpen}
        onOpenChange={setIsPublicModalOpen}
        onSubmit={handlePublicSubmit}
        isSubmitting={isPublicSubmitting}
      />
    </section>
  );
}

function CouncilorRadioCard({
  candidate,
  checked,
  disabled,
  onChange,
}: {
  candidate: CouncilorRecipientCandidate;
  checked: boolean;
  disabled: boolean;
  onChange: (id: string) => void;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 text-sm font-bold text-mirai-text transition-colors ${
        checked
          ? "border-primary bg-primary/10"
          : "border-gray-200 bg-white hover:bg-mirai-surface-gray"
      } ${disabled ? "cursor-not-allowed opacity-55" : ""}`}
    >
      <input
        type="radio"
        name="councilor_id"
        value={candidate.id}
        checked={checked}
        disabled={disabled}
        onChange={() => onChange(candidate.id)}
        className="size-4"
      />
      {candidate.iconUrl ? (
        <Image
          src={candidate.iconUrl}
          alt=""
          width={48}
          height={48}
          className="size-12 shrink-0 rounded-full object-cover"
        />
      ) : (
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-mirai-surface-muted text-xs text-mirai-text-secondary">
          顔写真
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate">{candidate.displayName}議員</span>
        <span className="text-xs text-mirai-text-secondary">
          {disabled ? "送信済み" : "委員会メンバー"}
        </span>
      </span>
    </label>
  );
}
