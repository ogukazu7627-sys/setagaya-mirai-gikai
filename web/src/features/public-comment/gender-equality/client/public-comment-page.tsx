"use client";

import {
  PublicCommentCampaignPage,
  type PublicCommentPageConfig,
} from "@/features/public-comment/shared/client/public-comment-campaign-page";
import { routes } from "@/lib/routes";
import {
  GENDER_EQUALITY_CAMPAIGN_TITLE,
  GENDER_EQUALITY_DV_SUPPORT_URL,
  GENDER_EQUALITY_OFFICIAL_SUBMISSION_URL,
  GENDER_EQUALITY_QUESTIONS,
  GENDER_EQUALITY_SOURCES,
  GENDER_EQUALITY_SUBMISSION_DEADLINE,
} from "../shared/campaign";
import {
  GENDER_EQUALITY_LEARNING_ESTIMATED_TIME,
  GENDER_EQUALITY_LEARNING_REVIEWED_AT,
  GENDER_EQUALITY_LESSONS,
} from "../shared/learning";

const GENDER_EQUALITY_PAGE_CONFIG: PublicCommentPageConfig = {
  campaignTitle: GENDER_EQUALITY_CAMPAIGN_TITLE,
  heroImageSrc: "/illustrations/interview-illustration.png",
  heroImageAlt: "話を丁寧に聴く人のイラスト",
  submissionDeadline: GENDER_EQUALITY_SUBMISSION_DEADLINE,
  officialSubmissionUrl: GENDER_EQUALITY_OFFICIAL_SUBMISSION_URL,
  sources: GENDER_EQUALITY_SOURCES,
  sourcesSummary:
    "素案本編・概要版、基礎となる条例と現行計画、女性支援の方針、現在の相談案内を区別して参照します。",
  lessons: GENDER_EQUALITY_LESSONS,
  learningReviewedAt: GENDER_EQUALITY_LEARNING_REVIEWED_AT,
  learningEstimatedTime: GENDER_EQUALITY_LEARNING_ESTIMATED_TIME,
  learningTitle: "世田谷区第三次男女共同参画プラン（素案）を知る６章",
  learningSubtitle: "性別に左右されない選択と参加について考える",
  learningNote:
    "今回の素案は、2027〜2031年度の５年間に、区がどのような取組を進めるかを示す計画案です。以下で紹介する施策には、新たな取組だけでなく、既存事業の継続・充実も含まれます。",
  targetDocumentLabel: "計画素案",
  questions: GENDER_EQUALITY_QUESTIONS,
  themes: GENDER_EQUALITY_QUESTIONS.map((question) => question.topic),
  audienceLabel: "区民、働く方、学校・地域・支援に関わる方へ",
  safetyContent: (
    <>
      <p>
        性別、性的指向・性自認、妊娠・出産、健康、差別や被害の経験など、話したくない個人情報を入力する必要はありません。氏名、住所、学校名、勤務先、施設名、連絡先など、人や場所が分かる情報も入力しないでください。
      </p>
      <p>
        ここは相談や緊急通報の窓口ではありません。現在、暴力や脅迫などで身の危険がある場合は、安全な場所へ移動し、110（警察）へ連絡してください。けがなどで救急が必要な場合は119へ連絡してください。このサービスから代わりに連絡することはできません。
      </p>
      <p>
        緊急ではないDVや交際相手からの暴力に関する相談先は、区の
        <a
          href={GENDER_EQUALITY_DV_SUPPORT_URL}
          target="_blank"
          rel="noreferrer"
          className="mx-1 font-bold text-primary-strong underline underline-offset-4"
        >
          DV相談窓口一覧
        </a>
        で確認できます。
      </p>
    </>
  ),
  authReturnKey: "gender-equality-interview-auth-return",
  routePath: routes.publicCommentGenderEquality(),
  apiBasePath: "/api/public-comment/gender-equality",
  screenReaderTitle: "第三次男女共同参画プラン素案へのAIパブコメインタビュー",
  privacyNotice:
    "センシティブな属性や被害の詳細、氏名、住所、学校名、勤務先、連絡先などは入力しないでください。ここは相談や緊急通報の窓口ではありません。",
  draftTextareaId: "gender-equality-public-comment-draft",
};

export function PublicCommentGenderEqualityPage() {
  return <PublicCommentCampaignPage config={GENDER_EQUALITY_PAGE_CONFIG} />;
}
