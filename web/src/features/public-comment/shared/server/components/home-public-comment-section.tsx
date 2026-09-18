import "server-only";

import type { Route } from "next";
import Image from "next/image";
import { Container } from "@/components/layouts/container";
import { DEMENTIA_HOPE_PLAN_SUBMISSION_DEADLINE } from "@/features/public-comment/dementia-hope-plan/shared/campaign";
import { DISABILITY_SUBMISSION_DEADLINE } from "@/features/public-comment/disability/shared/campaign";
import { ELDERLY_CARE_PLAN_SUBMISSION_DEADLINE } from "@/features/public-comment/elderly-care-plan/shared/campaign";
import { GENDER_EQUALITY_SUBMISSION_DEADLINE } from "@/features/public-comment/gender-equality/shared/campaign";
import { IJIME_SUBMISSION_DEADLINE } from "@/features/public-comment/ijime/shared/campaign";
import { INCLUSION_PLAN_SUBMISSION_DEADLINE } from "@/features/public-comment/inclusion-plan/shared/campaign";
import { MINPAKU_SUBMISSION_DEADLINE } from "@/features/public-comment/minpaku/shared/campaign";
import { RETAINING_WALL_SUBMISSION_DEADLINE } from "@/features/public-comment/retaining-wall/shared/campaign";
import {
  type HomePublicCommentCampaign,
  HomePublicCommentCarousel,
} from "@/features/public-comment/shared/client/home-public-comment-carousel";
import { SUICIDE_PREVENTION_SUBMISSION_DEADLINE } from "@/features/public-comment/suicide-prevention/shared/campaign";
import { routes } from "@/lib/routes";

const campaigns = [
  {
    label: "高齢者・介護",
    title: "第10期高齢者保健福祉計画・介護保険事業計画（素案）",
    description: "高齢者の暮らしや介護、地域で支える仕組みについて考えます。",
    deadline: ELDERLY_CARE_PLAN_SUBMISSION_DEADLINE,
    href: routes.publicCommentElderlyCarePlan() as Route,
    icon: "care",
  },
  {
    label: "認知症・地域共生",
    title: "第3期認知症とともに生きる希望計画（素案）",
    description:
      "認知症があっても自分らしく暮らせる地域と支援について考えます。",
    deadline: DEMENTIA_HOPE_PLAN_SUBMISSION_DEADLINE,
    href: routes.publicCommentDementiaHopePlan() as Route,
    icon: "brain",
  },
  {
    label: "民泊・旅館業",
    title: "民泊・旅館業の条例改正素案",
    description:
      "暮らしと観光の両立や、民泊・旅館業の新しいルールについて考えます。",
    deadline: MINPAKU_SUBMISSION_DEADLINE,
    href: routes.publicCommentMinpaku() as Route,
    icon: "house",
  },
  {
    label: "防災・まちづくり",
    title: "がけ・擁壁等防災対策方針（素案）",
    description:
      "がけや擁壁の安全確保、所有者への支援と地域の防災について考えます。",
    deadline: RETAINING_WALL_SUBMISSION_DEADLINE,
    href: routes.publicCommentRetainingWall() as Route,
    icon: "mountain",
  },
  {
    label: "男女共同参画",
    title: "第三次男女共同参画プラン（素案）",
    description:
      "性別にかかわらず自分らしく生きられる地域や支援について考えます。",
    deadline: GENDER_EQUALITY_SUBMISSION_DEADLINE,
    href: routes.publicCommentGenderEquality() as Route,
    icon: "equality",
  },
  {
    label: "こころの健康",
    title: "世田谷区自殺対策計画（素案）",
    description:
      "誰もが孤立せず、必要な相談や支援につながれる仕組みを考えます。",
    deadline: SUICIDE_PREVENTION_SUBMISSION_DEADLINE,
    href: routes.publicCommentSuicidePrevention() as Route,
    icon: "health",
  },
  {
    label: "障害理解・地域共生",
    title: "障害理解・地域共生条例の改正素案",
    description:
      "暮らしの選択や意思決定支援、区政参加のあり方について考えます。",
    deadline: DISABILITY_SUBMISSION_DEADLINE,
    href: routes.publicCommentDisability() as Route,
    icon: "accessibility",
  },
  {
    label: "障害施策・包括",
    title: "次期せたがやインクルージョンプラン（素案）",
    description:
      "地域生活、就労、教育や医療を含む障害施策の計画について考えます。",
    deadline: INCLUSION_PLAN_SUBMISSION_DEADLINE,
    href: routes.publicCommentInclusionPlan() as Route,
    icon: "community",
  },
  {
    label: "子ども・いじめ",
    title: "いじめの予防と解消に向けた条例素案",
    description:
      "子どもの意向と安全、予防・相談・支援の仕組みについて考えます。",
    deadline: IJIME_SUBMISSION_DEADLINE,
    href: routes.publicCommentIjime() as Route,
    icon: "school",
  },
] as const satisfies readonly HomePublicCommentCampaign[];

export function HomePublicCommentSection() {
  return (
    <section
      aria-labelledby="home-public-comment-heading"
      className="bg-mirai-surface py-10 md:py-12"
    >
      <Container>
        <div className="flex flex-col gap-6">
          <div className="flex items-end justify-between gap-8">
            <div className="max-w-2xl">
              <h2
                id="home-public-comment-heading"
                className="text-[22px] font-bold leading-[1.48] text-mirai-text"
              >
                AIパブコメインタビュー
              </h2>
              <p className="mt-1.5 text-sm font-medium leading-[1.8] text-mirai-text-secondary">
                AIの質問に答えながら考えを整理し、世田谷区へ提出する意見の下書きをつくれます。提出はご自身で公式フォームから行います。
              </p>
            </div>
            <Image
              src="/illustrations/interview-illustration.png"
              width={580}
              height={745}
              alt=""
              sizes="112px"
              className="hidden h-32 w-auto shrink-0 object-contain object-bottom md:block"
            />
          </div>

          <HomePublicCommentCarousel campaigns={campaigns} />
        </div>
      </Container>
    </section>
  );
}
