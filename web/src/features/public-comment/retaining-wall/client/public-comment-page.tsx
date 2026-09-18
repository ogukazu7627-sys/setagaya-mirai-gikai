"use client";

import {
  PublicCommentCampaignPage,
  type PublicCommentPageConfig,
} from "@/features/public-comment/shared/client/public-comment-campaign-page";
import { routes } from "@/lib/routes";
import {
  RETAINING_WALL_CAMPAIGN_TITLE,
  RETAINING_WALL_CONSULTATION_URL,
  RETAINING_WALL_MAINTENANCE_URL,
  RETAINING_WALL_OFFICIAL_SUBMISSION_URL,
  RETAINING_WALL_QUESTIONS,
  RETAINING_WALL_SOURCES,
  RETAINING_WALL_SUBMISSION_DEADLINE,
} from "../shared/campaign";
import {
  RETAINING_WALL_LEARNING_ESTIMATED_TIME,
  RETAINING_WALL_LEARNING_REVIEWED_AT,
  RETAINING_WALL_LESSONS,
} from "../shared/learning";

const RETAINING_WALL_PAGE_CONFIG: PublicCommentPageConfig = {
  campaignTitle: RETAINING_WALL_CAMPAIGN_TITLE,
  heroImageSrc: "/illustrations/retaining-wall-public-comment-hero.webp",
  heroImageAlt: "住宅地のがけ・擁壁を住民と専門家が確認するイラスト",
  submissionDeadline: RETAINING_WALL_SUBMISSION_DEADLINE,
  officialSubmissionUrl: RETAINING_WALL_OFFICIAL_SUBMISSION_URL,
  sources: RETAINING_WALL_SOURCES,
  sourcesSummary:
    "素案本編・概要版、現行方針、現在の補助・相談・維持管理制度、国の予防保全マニュアルを区別して参照します。",
  lessons: RETAINING_WALL_LESSONS,
  learningReviewedAt: RETAINING_WALL_LEARNING_REVIEWED_AT,
  learningEstimatedTime: RETAINING_WALL_LEARNING_ESTIMATED_TIME,
  learningTitle: "世田谷区の「がけ・擁壁」対策は、どう変わる？",
  learningSubtitle: "方針素案を理解するための６章とクイズ",
  learningNote:
    "※2026年９月公表の素案概要版と関連資料に基づく説明です。新たな補助制度などは検討段階であり、現在利用できる制度とは異なります。",
  targetDocumentLabel: "方針素案",
  questions: RETAINING_WALL_QUESTIONS,
  themes: RETAINING_WALL_QUESTIONS.map((question) => question.topic),
  audienceLabel: "所有者、近隣住民、事業者、防災や街づくりに関心のある方へ",
  safetyContent: (
    <>
      <p>
        ここは、個別のがけ・擁壁の安全判定や、補助金の申請窓口ではありません。正確な住所・地番、所有者名、施設名、会社名、個人名、連絡先、現地写真など、人や場所が分かる情報は入力しないでください。
      </p>
      <p>
        現在、大きなひび割れ、著しいふくらみ・傾き、土砂の流出など危険を感じる状況がある場合は、がけや擁壁に近づかず、今すぐの危険であれば119または110へ連絡してください。
      </p>
      <p>
        緊急でない維持管理や安全対策は、世田谷区建築審査課・構造審査担当（03-6432-7158）へ。区の
        <a
          href={RETAINING_WALL_MAINTENANCE_URL}
          target="_blank"
          rel="noreferrer"
          className="mx-1 font-bold text-primary-strong underline underline-offset-4"
        >
          維持管理の案内
        </a>
        や
        <a
          href={RETAINING_WALL_CONSULTATION_URL}
          target="_blank"
          rel="noreferrer"
          className="mx-1 font-bold text-primary-strong underline underline-offset-4"
        >
          無料相談会
        </a>
        も確認できます。
      </p>
    </>
  ),
  authReturnKey: "retaining-wall-interview-auth-return",
  routePath: routes.publicCommentRetainingWall(),
  apiBasePath: "/api/public-comment/retaining-wall",
  screenReaderTitle: "がけ・擁壁等防災対策方針素案へのAIパブコメインタビュー",
  privacyNotice:
    "正確な住所・地番、所有者名、施設名、会社名、個人名、連絡先などは入力しないでください。この画面で安全判定や補助申請はできません。",
  draftTextareaId: "retaining-wall-public-comment-draft",
};

export function PublicCommentRetainingWallPage() {
  return <PublicCommentCampaignPage config={RETAINING_WALL_PAGE_CONFIG} />;
}
