import "server-only";
import { z } from "zod";
import { buildInterviewPolicy as DEMENTIA_HOPE_PLAN_POLICY } from "../../dementia-hope-plan/server/prompt";
import {
  DEMENTIA_HOPE_PLAN_CAMPAIGN_SLUG,
  DEMENTIA_HOPE_PLAN_QUESTIONS,
  DEMENTIA_HOPE_PLAN_SOURCES,
} from "../../dementia-hope-plan/shared/campaign";
import { buildInterviewPolicy as DISABILITY_POLICY } from "../../disability/server/prompt";
import {
  DISABILITY_CAMPAIGN_SLUG,
  DISABILITY_QUESTIONS,
  DISABILITY_SOURCES,
} from "../../disability/shared/campaign";
import { buildInterviewPolicy as ELDERLY_CARE_PLAN_POLICY } from "../../elderly-care-plan/server/prompt";
import {
  ELDERLY_CARE_PLAN_CAMPAIGN_SLUG,
  ELDERLY_CARE_PLAN_QUESTIONS,
  ELDERLY_CARE_PLAN_SOURCES,
} from "../../elderly-care-plan/shared/campaign";
import { buildInterviewPolicy as GENDER_EQUALITY_POLICY } from "../../gender-equality/server/prompt";
import {
  GENDER_EQUALITY_CAMPAIGN_SLUG,
  GENDER_EQUALITY_QUESTIONS,
  GENDER_EQUALITY_SOURCES,
} from "../../gender-equality/shared/campaign";
import { buildInterviewPolicy as IJIME_POLICY } from "../../ijime/server/prompt";
import {
  IJIME_CAMPAIGN_SLUG,
  IJIME_QUESTIONS,
  IJIME_SOURCES,
} from "../../ijime/shared/campaign";
import { buildInterviewPolicy as INCLUSION_PLAN_POLICY } from "../../inclusion-plan/server/prompt";
import {
  INCLUSION_PLAN_CAMPAIGN_SLUG,
  INCLUSION_PLAN_QUESTIONS,
  INCLUSION_PLAN_SOURCES,
} from "../../inclusion-plan/shared/campaign";
import { buildInterviewPolicy as MINPAKU_POLICY } from "../../minpaku/server/prompt";
import {
  MINPAKU_CAMPAIGN_SLUG,
  MINPAKU_QUESTIONS,
  MINPAKU_SOURCES,
} from "../../minpaku/shared/campaign";
import { buildInterviewPolicy as RETAINING_WALL_POLICY } from "../../retaining-wall/server/prompt";
import {
  RETAINING_WALL_CAMPAIGN_SLUG,
  RETAINING_WALL_QUESTIONS,
  RETAINING_WALL_SOURCES,
} from "../../retaining-wall/shared/campaign";
import { buildInterviewPolicy as SUICIDE_PREVENTION_POLICY } from "../../suicide-prevention/server/prompt";
import {
  SUICIDE_PREVENTION_CAMPAIGN_SLUG,
  SUICIDE_PREVENTION_QUESTIONS,
  SUICIDE_PREVENTION_SOURCES,
} from "../../suicide-prevention/shared/campaign";
import { buildInterviewPolicy as TRAFFIC_SAFETY_PLAN_POLICY } from "../../traffic-safety-plan/server/prompt";
import {
  TRAFFIC_SAFETY_PLAN_CAMPAIGN_SLUG,
  TRAFFIC_SAFETY_PLAN_QUESTIONS,
  TRAFFIC_SAFETY_PLAN_SOURCES,
} from "../../traffic-safety-plan/shared/campaign";
import type { InterviewQuestion } from "../interview-state";

export type InterviewCampaign = {
  key: string;
  slug: string;
  questions: readonly InterviewQuestion[];
  sources: readonly { id: string; title: string; url: string }[];
  policy: () => string;
  receiptEnabled: boolean;
};

function splitFixedQuestion(question: { question: string; context?: string }) {
  if (typeof question.context === "string")
    return { premise: question.context, ask: question.question };
  const paragraphs = question.question
    .trim()
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const questionParagraphIndex = paragraphs.findIndex((paragraph) =>
    /[？?]/u.test(paragraph)
  );
  if (questionParagraphIndex >= 0) {
    return {
      premise: paragraphs.slice(0, questionParagraphIndex).join("\n\n"),
      ask: paragraphs.slice(questionParagraphIndex).join("\n\n"),
    };
  }
  return {
    premise: paragraphs.slice(0, -1).join("\n\n"),
    ask: paragraphs.at(-1) ?? question.question,
  };
}

const campaigns = {
  minpaku: {
    slug: MINPAKU_CAMPAIGN_SLUG,
    questions: MINPAKU_QUESTIONS,
    sources: MINPAKU_SOURCES,
    policy: MINPAKU_POLICY,
  },
  ijime: {
    slug: IJIME_CAMPAIGN_SLUG,
    questions: IJIME_QUESTIONS,
    sources: IJIME_SOURCES,
    policy: IJIME_POLICY,
  },
  disability: {
    slug: DISABILITY_CAMPAIGN_SLUG,
    questions: DISABILITY_QUESTIONS,
    sources: DISABILITY_SOURCES,
    policy: DISABILITY_POLICY,
  },
  "retaining-wall": {
    slug: RETAINING_WALL_CAMPAIGN_SLUG,
    questions: RETAINING_WALL_QUESTIONS,
    sources: RETAINING_WALL_SOURCES,
    policy: RETAINING_WALL_POLICY,
  },
  "suicide-prevention": {
    slug: SUICIDE_PREVENTION_CAMPAIGN_SLUG,
    questions: SUICIDE_PREVENTION_QUESTIONS,
    sources: SUICIDE_PREVENTION_SOURCES,
    policy: SUICIDE_PREVENTION_POLICY,
  },
  "gender-equality": {
    slug: GENDER_EQUALITY_CAMPAIGN_SLUG,
    questions: GENDER_EQUALITY_QUESTIONS,
    sources: GENDER_EQUALITY_SOURCES,
    policy: GENDER_EQUALITY_POLICY,
  },
  "inclusion-plan": {
    slug: INCLUSION_PLAN_CAMPAIGN_SLUG,
    questions: INCLUSION_PLAN_QUESTIONS,
    sources: INCLUSION_PLAN_SOURCES,
    policy: INCLUSION_PLAN_POLICY,
  },
  "elderly-care-plan": {
    slug: ELDERLY_CARE_PLAN_CAMPAIGN_SLUG,
    questions: ELDERLY_CARE_PLAN_QUESTIONS,
    sources: ELDERLY_CARE_PLAN_SOURCES,
    policy: ELDERLY_CARE_PLAN_POLICY,
  },
  "dementia-hope-plan": {
    slug: DEMENTIA_HOPE_PLAN_CAMPAIGN_SLUG,
    questions: DEMENTIA_HOPE_PLAN_QUESTIONS,
    sources: DEMENTIA_HOPE_PLAN_SOURCES,
    policy: DEMENTIA_HOPE_PLAN_POLICY,
  },
  "traffic-safety-plan": {
    slug: TRAFFIC_SAFETY_PLAN_CAMPAIGN_SLUG,
    questions: TRAFFIC_SAFETY_PLAN_QUESTIONS,
    sources: TRAFFIC_SAFETY_PLAN_SOURCES,
    policy: TRAFFIC_SAFETY_PLAN_POLICY,
  },
};
export type CampaignKey = keyof typeof campaigns;

export function getInterviewCampaign(
  key: CampaignKey,
  targets: unknown = {}
): InterviewCampaign {
  const campaign = campaigns[key];
  const targetAudiences = z
    .record(z.string(), z.string().max(1000))
    .parse(targets);
  for (const id of Object.keys(targetAudiences)) {
    if (!campaign.questions.some((q) => q.id === id))
      throw new Error("Unknown target question");
  }
  return {
    key,
    slug: campaign.slug,
    policy: campaign.policy,
    sources: campaign.sources,
    receiptEnabled: true,
    questions: campaign.questions.map((q) => {
      return {
        ...q,
        // The campaign files contain the canonical fixed question text. Keep
        // it server-controlled instead of replacing it with an AI-generated
        // or shortened presentation.
        ...splitFixedQuestion(q),
        targetAudience: targetAudiences[q.id] || undefined,
      };
    }),
  };
}
