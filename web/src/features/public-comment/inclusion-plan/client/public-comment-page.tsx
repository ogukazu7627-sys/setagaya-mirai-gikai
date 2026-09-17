"use client";

import {
  PublicCommentCampaignPage,
  type PublicCommentPageConfig,
} from "@/features/public-comment/shared/client/public-comment-campaign-page";
import { routes } from "@/lib/routes";
import {
  INCLUSION_PLAN_ABUSE_CONSULTATION_URL,
  INCLUSION_PLAN_CAMPAIGN_TITLE,
  INCLUSION_PLAN_DISCRIMINATION_CONSULTATION_URL,
  INCLUSION_PLAN_OFFICIAL_SUBMISSION_URL,
  INCLUSION_PLAN_QUESTIONS,
  INCLUSION_PLAN_SOURCES,
  INCLUSION_PLAN_SUBMISSION_DEADLINE,
} from "../shared/campaign";
import {
  INCLUSION_PLAN_LEARNING_ESTIMATED_TIME,
  INCLUSION_PLAN_LEARNING_REVIEWED_AT,
  INCLUSION_PLAN_LESSONS,
} from "../shared/learning";

const INCLUSION_PLAN_PAGE_CONFIG: PublicCommentPageConfig = {
  campaignTitle: INCLUSION_PLAN_CAMPAIGN_TITLE,
  heroImageSrc: "/illustrations/interview-illustration.png",
  heroImageAlt: "話を丁寧に聴く人のイラスト",
  submissionDeadline: INCLUSION_PLAN_SUBMISSION_DEADLINE,
  officialSubmissionUrl: INCLUSION_PLAN_OFFICIAL_SUBMISSION_URL,
  sources: INCLUSION_PLAN_SOURCES,
  sourcesSummary:
    "計画素案の概要版・全文・わかりやすい版、現行計画、関連する条例改正、実態調査を区別して参照します。",
  lessons: INCLUSION_PLAN_LESSONS,
  learningReviewedAt: INCLUSION_PLAN_LEARNING_REVIEWED_AT,
  learningEstimatedTime: INCLUSION_PLAN_LEARNING_ESTIMATED_TIME,
  learningTitle: "次期せたがやインクルージョンプラン（素案）を知る６章",
  learningSubtitle: "――区は何を進めようとしているのか",
  learningNote:
    "※2026年９月時点の素案に基づく解説です。記載された取組みには、既存事業の継続・拡充と、今後具体化する内容が含まれます。",
  targetDocumentLabel: "計画素案",
  questions: INCLUSION_PLAN_QUESTIONS,
  themes: INCLUSION_PLAN_QUESTIONS.map((question) => question.topic),
  audienceLabel: "本人、家族、支援者、事業者、関心のある区民の方へ",
  safetyContent: (
    <>
      <p>
        ここは個別の差別や虐待を相談・通報する窓口ではありません。個人名、住所、勤務先・学校名、施設・事業所名、診断名や利用サービスなど、本人や関係者が分かる情報は入力しないでください。
      </p>
      <p>
        差別について相談したい場合は、世田谷区の
        <a
          href={INCLUSION_PLAN_DISCRIMINATION_CONSULTATION_URL}
          target="_blank"
          rel="noreferrer"
          className="mx-1 font-bold text-primary-strong underline underline-offset-4"
        >
          障害者差別解消支援専門調査員
        </a>
        （03-5432-2424）へ。虐待の疑いがある場合は
        <a
          href={INCLUSION_PLAN_ABUSE_CONSULTATION_URL}
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
  authReturnKey: "inclusion-plan-interview-auth-return",
  routePath: routes.publicCommentInclusionPlan(),
  apiBasePath: "/api/public-comment/inclusion-plan",
  screenReaderTitle:
    "次期せたがやインクルージョンプラン素案パブリックコメントのAIインタビュー",
  privacyNotice:
    "氏名・住所・勤務先・施設名・診断名などは入力しないでください。この画面から相談や通報はされません。",
  draftTextareaId: "inclusion-plan-public-comment-draft",
};

export function PublicCommentInclusionPlanPage() {
  return <PublicCommentCampaignPage config={INCLUSION_PLAN_PAGE_CONFIG} />;
}
