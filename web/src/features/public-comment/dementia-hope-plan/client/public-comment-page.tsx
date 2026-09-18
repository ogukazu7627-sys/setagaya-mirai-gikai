"use client";

import {
  PublicCommentCampaignPage,
  type PublicCommentPageConfig,
} from "@/features/public-comment/shared/client/public-comment-campaign-page";
import { routes } from "@/lib/routes";
import {
  DEMENTIA_HOPE_PLAN_CAMPAIGN_TITLE,
  DEMENTIA_HOPE_PLAN_CONSULTATION_URL,
  DEMENTIA_HOPE_PLAN_OFFICIAL_SUBMISSION_URL,
  DEMENTIA_HOPE_PLAN_QUESTIONS,
  DEMENTIA_HOPE_PLAN_SOURCES,
  DEMENTIA_HOPE_PLAN_SUBMISSION_DEADLINE,
} from "../shared/campaign";
import {
  DEMENTIA_HOPE_PLAN_LEARNING_ESTIMATED_TIME,
  DEMENTIA_HOPE_PLAN_LEARNING_REVIEWED_AT,
  DEMENTIA_HOPE_PLAN_LESSONS,
} from "../shared/learning";

const DEMENTIA_HOPE_PLAN_PAGE_CONFIG: PublicCommentPageConfig = {
  campaignTitle: DEMENTIA_HOPE_PLAN_CAMPAIGN_TITLE,
  heroImageSrc: "/illustrations/dementia-hope-plan-public-comment-hero.webp",
  heroImageAlt: "高齢者と支援者が地域を歩くイラスト",
  submissionDeadline: DEMENTIA_HOPE_PLAN_SUBMISSION_DEADLINE,
  officialSubmissionUrl: DEMENTIA_HOPE_PLAN_OFFICIAL_SUBMISSION_URL,
  sources: DEMENTIA_HOPE_PLAN_SOURCES,
  sourcesSummary:
    "第3期計画素案の概要版・本編、希望条例、現行計画、もの忘れ相談窓口、別手続きの高齢・介護計画を区別して参照します。",
  lessons: DEMENTIA_HOPE_PLAN_LESSONS,
  learningReviewedAt: DEMENTIA_HOPE_PLAN_LEARNING_REVIEWED_AT,
  learningEstimatedTime: DEMENTIA_HOPE_PLAN_LEARNING_ESTIMATED_TIME,
  learningTitle: "認知症になってからの暮らしを、世田谷区はどう支える？",
  learningSubtitle: "第3期「認知症とともに生きる希望計画（素案）」を知る６章",
  learningNote:
    "※2026年9月公表の素案と関連資料に基づく説明です。評価指標の数値目標など、今後具体化・確定する内容があります。",
  targetDocumentLabel: "計画素案",
  questions: DEMENTIA_HOPE_PLAN_QUESTIONS,
  themes: DEMENTIA_HOPE_PLAN_QUESTIONS.map((question) => question.topic),
  audienceLabel:
    "認知症の本人、家族や身近な人、支援者、事業者、地域での暮らしに関心のある方へ",
  safetyContent: (
    <>
      <p>
        ここは認知症の診断、個別の医療・介護相談、介護保険の申請窓口ではありません。個人名、住所、勤務先、施設・事業所名、詳しい病状・診断名・要介護度、家族関係など、本人や関係者が分かる情報は入力しないでください。
      </p>
      <p>
        認知症や若年性認知症、介護、家族への支援について相談したい場合は、世田谷区の
        <a
          href={DEMENTIA_HOPE_PLAN_CONSULTATION_URL}
          target="_blank"
          rel="noreferrer"
          className="mx-1 font-bold text-primary-strong underline underline-offset-4"
        >
          もの忘れ相談窓口
        </a>
        へ相談できます。今まさに生命・身体の危険がある場合は119、事件・事故など警察への緊急通報は110です。
      </p>
    </>
  ),
  authReturnKey: "dementia-hope-plan-interview-auth-return",
  routePath: routes.publicCommentDementiaHopePlan(),
  apiBasePath: "/api/public-comment/dementia-hope-plan",
  screenReaderTitle:
    "第3期認知症とともに生きる希望計画素案パブリックコメントのAIインタビュー",
  privacyNotice:
    "氏名・住所・勤務先・施設名・詳しい病状・診断名・要介護度・家族関係などは入力しないでください。この画面から診断、相談、申請はされません。",
  draftTextareaId: "dementia-hope-plan-public-comment-draft",
};

export function PublicCommentDementiaHopePlanPage() {
  return <PublicCommentCampaignPage config={DEMENTIA_HOPE_PLAN_PAGE_CONFIG} />;
}
