"use client";

import {
  PublicCommentCampaignPage,
  type PublicCommentPageConfig,
} from "@/features/public-comment/shared/client/public-comment-campaign-page";
import { routes } from "@/lib/routes";
import {
  ELDERLY_CARE_PLAN_CAMPAIGN_TITLE,
  ELDERLY_CARE_PLAN_CONSULTATION_URL,
  ELDERLY_CARE_PLAN_OFFICIAL_SUBMISSION_URL,
  ELDERLY_CARE_PLAN_QUESTIONS,
  ELDERLY_CARE_PLAN_SOURCES,
  ELDERLY_CARE_PLAN_SUBMISSION_DEADLINE,
} from "../shared/campaign";
import {
  ELDERLY_CARE_PLAN_LEARNING_ESTIMATED_TIME,
  ELDERLY_CARE_PLAN_LEARNING_REVIEWED_AT,
  ELDERLY_CARE_PLAN_LESSONS,
} from "../shared/learning";

const ELDERLY_CARE_PLAN_PAGE_CONFIG: PublicCommentPageConfig = {
  campaignTitle: ELDERLY_CARE_PLAN_CAMPAIGN_TITLE,
  heroImageSrc: "/illustrations/elderly-care-plan-public-comment-hero.webp",
  heroImageAlt: "高齢者や家族、支援者が地域で過ごすイラスト",
  submissionDeadline: ELDERLY_CARE_PLAN_SUBMISSION_DEADLINE,
  officialSubmissionUrl: ELDERLY_CARE_PLAN_OFFICIAL_SUBMISSION_URL,
  sources: ELDERLY_CARE_PLAN_SOURCES,
  sourcesSummary:
    "計画素案の概要版・本編、現行計画、基礎調査、別手続きの認知症計画、相談窓口を区別して参照します。",
  lessons: ELDERLY_CARE_PLAN_LESSONS,
  learningReviewedAt: ELDERLY_CARE_PLAN_LEARNING_REVIEWED_AT,
  learningEstimatedTime: ELDERLY_CARE_PLAN_LEARNING_ESTIMATED_TIME,
  learningTitle: "第10期世田谷区高齢者保健福祉計画・介護保険事業計画（素案）",
  learningSubtitle: "区が進めようとしていることを知る、6つの章",
  learningNote:
    "※2026年9月公表の素案と関連資料に基づく説明です。介護保険料や一部の目標値など、今後具体化・確定する内容があります。",
  targetDocumentLabel: "計画素案",
  questions: ELDERLY_CARE_PLAN_QUESTIONS,
  themes: ELDERLY_CARE_PLAN_QUESTIONS.map((question) => question.topic),
  audienceLabel:
    "高齢期の暮らし、家族の介護、地域活動、医療・介護の仕事、制度に関心のある方へ",
  safetyContent: (
    <>
      <p>
        ここは個別の医療・介護相談や、介護保険の申請窓口ではありません。個人名、住所、勤務先、施設・事業所名、詳しい病状・診断名・要介護度、所得など、本人や関係者が分かる情報は入力しないでください。
      </p>
      <p>
        高齢者や家族の介護、介護保険、保健福祉サービスについて相談したい場合は、世田谷区の
        <a
          href={ELDERLY_CARE_PLAN_CONSULTATION_URL}
          target="_blank"
          rel="noreferrer"
          className="mx-1 font-bold text-primary-strong underline underline-offset-4"
        >
          あんしんすこやかセンター
        </a>
        へ相談できます。今まさに生命・身体の危険がある場合は119、事件・事故など警察への緊急通報は110です。
      </p>
    </>
  ),
  authReturnKey: "elderly-care-plan-interview-auth-return",
  routePath: routes.publicCommentElderlyCarePlan(),
  apiBasePath: "/api/public-comment/elderly-care-plan",
  screenReaderTitle:
    "第10期高齢者保健福祉・介護保険事業計画素案パブリックコメントのAIインタビュー",
  privacyNotice:
    "氏名・住所・勤務先・施設名・詳しい病状・要介護度・所得などは入力しないでください。この画面から医療・介護の相談や申請はされません。",
  draftTextareaId: "elderly-care-plan-public-comment-draft",
};

export function PublicCommentElderlyCarePlanPage() {
  return <PublicCommentCampaignPage config={ELDERLY_CARE_PLAN_PAGE_CONFIG} />;
}
