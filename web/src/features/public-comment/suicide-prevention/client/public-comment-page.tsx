"use client";

import {
  PublicCommentCampaignPage,
  type PublicCommentPageConfig,
} from "@/features/public-comment/shared/client/public-comment-campaign-page";
import { routes } from "@/lib/routes";
import {
  MHLW_SUPPORT_URL,
  SUICIDE_PREVENTION_CAMPAIGN_TITLE,
  SUICIDE_PREVENTION_OFFICIAL_SUBMISSION_URL,
  SUICIDE_PREVENTION_QUESTIONS,
  SUICIDE_PREVENTION_SOURCES,
  SUICIDE_PREVENTION_SUBMISSION_DEADLINE,
  SUICIDE_PREVENTION_SUPPORT_URL,
} from "../shared/campaign";
import {
  SUICIDE_PREVENTION_LEARNING_ESTIMATED_TIME,
  SUICIDE_PREVENTION_LEARNING_REVIEWED_AT,
  SUICIDE_PREVENTION_LESSONS,
} from "../shared/learning";

const SUICIDE_PREVENTION_PAGE_CONFIG: PublicCommentPageConfig = {
  campaignTitle: SUICIDE_PREVENTION_CAMPAIGN_TITLE,
  heroImageSrc: "/illustrations/suicide-prevention-public-comment-hero.webp",
  heroImageAlt: "明るい相談室で相談員が話を聴くイラスト",
  submissionDeadline: SUICIDE_PREVENTION_SUBMISSION_DEADLINE,
  officialSubmissionUrl: SUICIDE_PREVENTION_OFFICIAL_SUBMISSION_URL,
  sources: SUICIDE_PREVENTION_SOURCES,
  sourcesSummary:
    "素案本編・概要版、現行の取組、区の相談案内、改正法の通知、他区の比較例を区別して参照します。",
  lessons: SUICIDE_PREVENTION_LESSONS,
  learningReviewedAt: SUICIDE_PREVENTION_LEARNING_REVIEWED_AT,
  learningEstimatedTime: SUICIDE_PREVENTION_LEARNING_ESTIMATED_TIME,
  learningTitle: "世田谷区自殺対策計画（素案）",
  learningSubtitle: "区民が知っておきたい６つのこと",
  learningNote:
    "※2026年９月公表の素案と関連資料に基づく説明です。計画は現在、素案の段階です。",
  targetDocumentLabel: "計画素案",
  questions: SUICIDE_PREVENTION_QUESTIONS,
  themes: SUICIDE_PREVENTION_QUESTIONS.map((question) => question.topic),
  audienceLabel: "区民、学校・職場・地域・支援に関わる方へ",
  safetyContent: (
    <>
      <p>
        ここは、パブリックコメントの下書きを作る場であり、こころの相談、診断・治療、緊急通報の窓口ではありません。個人的なつらい経験や医療情報は入力しなくて大丈夫です。
      </p>
      <p>
        いま自分や誰かの命に危険がある場合は、119（救急）または110（警察）へ連絡してください。可能なら一人にならず、身近な人に助けを求めてください。このサービスから代わりに連絡することはできません。
      </p>
      <p>
        世田谷区夜間こころの電話相談（03-6276-0044、年末年始を除く17時〜21時30分）などは、区の
        <a
          href={SUICIDE_PREVENTION_SUPPORT_URL}
          target="_blank"
          rel="noreferrer"
          className="mx-1 font-bold text-primary-strong underline underline-offset-4"
        >
          こころの相談案内
        </a>
        で確認できます。電話やSNSの相談先は、厚生労働省の
        <a
          href={MHLW_SUPPORT_URL}
          target="_blank"
          rel="noreferrer"
          className="mx-1 font-bold text-primary-strong underline underline-offset-4"
        >
          まもろうよ こころ
        </a>
        から選べます。
      </p>
    </>
  ),
  authReturnKey: "suicide-prevention-interview-auth-return",
  routePath: routes.publicCommentSuicidePrevention(),
  apiBasePath: "/api/public-comment/suicide-prevention",
  screenReaderTitle: "自殺対策計画素案へのAIパブコメインタビュー",
  privacyNotice:
    "ここは相談窓口ではありません。個人的な危機や医療情報は入力不要です。今すぐ命の危険がある場合は119または110へ。",
  draftTextareaId: "suicide-prevention-public-comment-draft",
};

export function PublicCommentSuicidePreventionPage() {
  return <PublicCommentCampaignPage config={SUICIDE_PREVENTION_PAGE_CONFIG} />;
}
