"use client";

import {
  PublicCommentCampaignPage,
  type PublicCommentPageConfig,
} from "@/features/public-comment/shared/client/public-comment-campaign-page";
import { routes } from "@/lib/routes";
import {
  TRAFFIC_SAFETY_PLAN_CAMPAIGN_TITLE,
  TRAFFIC_SAFETY_PLAN_OFFICIAL_INFORMATION_URL,
  TRAFFIC_SAFETY_PLAN_OFFICIAL_SUBMISSION_URL,
  TRAFFIC_SAFETY_PLAN_QUESTIONS,
  TRAFFIC_SAFETY_PLAN_SOURCES,
  TRAFFIC_SAFETY_PLAN_SUBMISSION_DEADLINE,
} from "../shared/campaign";
import {
  TRAFFIC_SAFETY_PLAN_LEARNING_ESTIMATED_TIME,
  TRAFFIC_SAFETY_PLAN_LEARNING_REVIEWED_AT,
  TRAFFIC_SAFETY_PLAN_LESSONS,
} from "../shared/learning";

const TRAFFIC_SAFETY_PLAN_PAGE_CONFIG: PublicCommentPageConfig = {
  campaignTitle: TRAFFIC_SAFETY_PLAN_CAMPAIGN_TITLE,
  heroImageSrc: "/illustrations/traffic-safety-plan-public-comment-hero.webp",
  heroImageAlt: "子どもや高齢者、自転車利用者が道路を安全に通行するイラスト",
  submissionDeadline: TRAFFIC_SAFETY_PLAN_SUBMISSION_DEADLINE,
  officialSubmissionUrl: TRAFFIC_SAFETY_PLAN_OFFICIAL_SUBMISSION_URL,
  sources: TRAFFIC_SAFETY_PLAN_SOURCES,
  sourcesSummary:
    "計画素案の概要版・本文、現行計画、生活道路の速度制度、自転車の青切符制度を区別して参照します。",
  lessons: TRAFFIC_SAFETY_PLAN_LESSONS,
  learningReviewedAt: TRAFFIC_SAFETY_PLAN_LEARNING_REVIEWED_AT,
  learningEstimatedTime: TRAFFIC_SAFETY_PLAN_LEARNING_ESTIMATED_TIME,
  learningTitle: "第12次世田谷区交通安全計画（素案）を知る６章",
  learningSubtitle: "交通安全の目標・重点課題・実行体制を確認する",
  learningNote:
    "※2026年9月公表の素案と関連資料に基づく説明です。目標は今後目指すもので、個別の対策場所や時期がすべて決まったわけではありません。",
  targetDocumentLabel: "計画素案",
  questions: TRAFFIC_SAFETY_PLAN_QUESTIONS,
  themes: TRAFFIC_SAFETY_PLAN_QUESTIONS.map((question) => question.topic),
  audienceLabel:
    "徒歩・自転車・車・バイク・車いす・送迎など、区内の移動や交通安全に関心のある方へ",
  safetyContent: (
    <>
      <p>
        ここは個別の事故・違反・道路危険箇所の通報窓口ではありません。住所、道路名・交差点名、学校・勤務先・施設名、事故日時、車両番号、氏名、けがの詳細など、人や場所が分かる情報は入力しないでください。
      </p>
      <p>
        事故、けが、道路上の差し迫った危険がある場合は、この画面ではなく、救急・消防は119、事件・事故や差し迫った危険は110へ連絡してください。募集内容や提出方法は、世田谷区の
        <a
          href={TRAFFIC_SAFETY_PLAN_OFFICIAL_INFORMATION_URL}
          target="_blank"
          rel="noreferrer"
          className="mx-1 font-bold text-primary-strong underline underline-offset-4"
        >
          公式の意見募集ページ
        </a>
        で確認できます。
      </p>
    </>
  ),
  authReturnKey: "traffic-safety-plan-interview-auth-return",
  routePath: routes.publicCommentTrafficSafetyPlan(),
  apiBasePath: "/api/public-comment/traffic-safety-plan",
  screenReaderTitle:
    "第12次世田谷区交通安全計画素案パブリックコメントのAIインタビュー",
  privacyNotice:
    "住所・道路名・交差点名・学校・勤務先・事故日時・車両番号・氏名・けがの詳細などは入力しないでください。この画面から事故や危険箇所の通報はされません。",
  draftTextareaId: "traffic-safety-plan-public-comment-draft",
};

export function PublicCommentTrafficSafetyPlanPage() {
  return <PublicCommentCampaignPage config={TRAFFIC_SAFETY_PLAN_PAGE_CONFIG} />;
}
