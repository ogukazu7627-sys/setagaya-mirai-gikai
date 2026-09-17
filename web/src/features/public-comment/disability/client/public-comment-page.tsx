"use client";

import {
  PublicCommentCampaignPage,
  type PublicCommentPageConfig,
} from "@/features/public-comment/shared/client/public-comment-campaign-page";
import { routes } from "@/lib/routes";
import {
  DISABILITY_ABUSE_CONSULTATION_URL,
  DISABILITY_CAMPAIGN_TITLE,
  DISABILITY_DISCRIMINATION_CONSULTATION_URL,
  DISABILITY_OFFICIAL_SUBMISSION_URL,
  DISABILITY_QUESTIONS,
  DISABILITY_SOURCES,
  DISABILITY_SUBMISSION_DEADLINE,
} from "../shared/campaign";
import {
  DISABILITY_LEARNING_ESTIMATED_TIME,
  DISABILITY_LEARNING_REVIEWED_AT,
  DISABILITY_LESSONS,
} from "../shared/learning";

const DISABILITY_PAGE_CONFIG: PublicCommentPageConfig = {
  campaignTitle: DISABILITY_CAMPAIGN_TITLE,
  submissionDeadline: DISABILITY_SUBMISSION_DEADLINE,
  officialSubmissionUrl: DISABILITY_OFFICIAL_SUBMISSION_URL,
  sources: DISABILITY_SOURCES,
  sourcesSummary:
    "改正素案、わかりやすい版、概要版、新旧対照表、現行条例、区の計画、国の意思決定支援ガイドライン、国連勧告を区別して参照します。",
  lessons: DISABILITY_LESSONS,
  learningReviewedAt: DISABILITY_LEARNING_REVIEWED_AT,
  learningEstimatedTime: DISABILITY_LEARNING_ESTIMATED_TIME,
  learningTitle: "障害理解の条例改正で、何が変わる？",
  learningSubtitle: "区民が知っておきたい６つのポイント",
  learningNote:
    "※2026年９月公表の改正素案に基づく説明です。改正内容は、まだ確定していません。",
  questions: DISABILITY_QUESTIONS,
  themes: DISABILITY_QUESTIONS.map((question) => question.topic),
  audienceLabel: "本人、家族、支援者、事業者、関心のある区民の方へ",
  safetyContent: (
    <>
      <p>
        ここは個別の差別や虐待を相談・通報する窓口ではありません。個人名、住所、勤務先・学校名、施設・事業所名、診断名や利用サービスなど、本人や関係者が分かる情報は入力しないでください。
      </p>
      <p>
        差別について相談したい場合は、世田谷区の
        <a
          href={DISABILITY_DISCRIMINATION_CONSULTATION_URL}
          target="_blank"
          rel="noreferrer"
          className="mx-1 font-bold text-primary-strong underline underline-offset-4"
        >
          障害者差別解消支援専門調査員
        </a>
        （03-5432-2424）へ。虐待の疑いがある場合は
        <a
          href={DISABILITY_ABUSE_CONSULTATION_URL}
          target="_blank"
          rel="noreferrer"
          className="mx-1 font-bold text-primary-strong underline underline-offset-4"
        >
          区の通報・届出窓口
        </a>
        へ連絡してください。夜間・休日は03-5432-1033、今まさに生命・身体の危険がある場合は110・119です。
      </p>
    </>
  ),
  authReturnKey: "disability-interview-auth-return",
  routePath: routes.publicCommentDisability(),
  apiBasePath: "/api/public-comment/disability",
  screenReaderTitle:
    "障害理解・地域共生条例改正パブリックコメントのAIインタビュー",
  privacyNotice:
    "氏名・住所・勤務先・施設名・診断名などは入力しないでください。この画面から相談や通報はされません。",
  draftTextareaId: "disability-public-comment-draft",
};

export function PublicCommentDisabilityPage() {
  return <PublicCommentCampaignPage config={DISABILITY_PAGE_CONFIG} />;
}
