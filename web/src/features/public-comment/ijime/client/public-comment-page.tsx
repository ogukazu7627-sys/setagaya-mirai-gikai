"use client";

import {
  PublicCommentCampaignPage,
  type PublicCommentPageConfig,
} from "@/features/public-comment/shared/client/public-comment-campaign-page";
import { routes } from "@/lib/routes";
import {
  IJIME_CAMPAIGN_TITLE,
  IJIME_OFFICIAL_SUBMISSION_URL,
  IJIME_QUESTIONS,
  IJIME_SOURCES,
  IJIME_SUBMISSION_DEADLINE,
  SETA_HOT_CONSULTATION_URL,
} from "../shared/campaign";
import {
  IJIME_LEARNING_ESTIMATED_TIME,
  IJIME_LEARNING_REVIEWED_AT,
  IJIME_LESSONS,
} from "../shared/learning";

const IJIME_PAGE_CONFIG: PublicCommentPageConfig = {
  campaignTitle: IJIME_CAMPAIGN_TITLE,
  heroImageSrc: "/illustrations/ijime-public-comment-hero.webp",
  heroImageAlt: "子どもたちが安心して話せる学びの場を描いたイラスト",
  submissionDeadline: IJIME_SUBMISSION_DEADLINE,
  officialSubmissionUrl: IJIME_OFFICIAL_SUBMISSION_URL,
  sources: IJIME_SOURCES,
  sourcesSummary:
    "条例素案と概要版、現在の基本方針、子どもの権利条例、重大事態の案内、せたホッと、国の資料を区別して参照します。",
  lessons: IJIME_LESSONS,
  learningReviewedAt: IJIME_LEARNING_REVIEWED_AT,
  learningEstimatedTime: IJIME_LEARNING_ESTIMATED_TIME,
  questions: IJIME_QUESTIONS,
  themes: [
    "このテーマとの関わり",
    "特に考えたい論点",
    "経験から見える課題と期待",
    "子どもの意向と安全",
    "実際に動く仕組み",
    "区への具体的な提案",
    "最も伝えたいこと",
  ],
  audienceLabel: "子どもから大人まで、区への意見を考えている方へ",
  safetyContent: (
    <>
      <p>
        ここは個別のいじめを相談・通報する窓口ではありません。個人名、学校名、学年・クラス、具体的な日時やSNSアカウントなど、誰かが分かる情報は入力しないでください。
      </p>
      <p>
        今まさに危険がある場合は110・119へ。困っていることやつらいことを相談したい場合は、世田谷区の第三者機関
        <a
          href={SETA_HOT_CONSULTATION_URL}
          target="_blank"
          rel="noreferrer"
          className="mx-1 font-bold text-primary-strong underline underline-offset-4"
        >
          「せたホッと」
        </a>
        （0120-810-293）など、信頼できる窓口や大人につながってください。
      </p>
    </>
  ),
  authReturnKey: "ijime-interview-auth-return",
  routePath: routes.publicCommentIjime(),
  apiBasePath: "/api/public-comment/ijime",
  screenReaderTitle: "いじめ条例パブリックコメントのAIインタビュー",
  privacyNotice:
    "個人名・学校名・詳しい出来事は入力しないでください。この画面から相談や通報はされません。",
  draftTextareaId: "ijime-public-comment-draft",
};

export function PublicCommentIjimePage() {
  return <PublicCommentCampaignPage config={IJIME_PAGE_CONFIG} />;
}
