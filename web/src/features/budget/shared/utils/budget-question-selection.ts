import {
  BUDGET_QUESTION_CATEGORIES,
  type BudgetQuestionCategorySlug,
} from "../constants/budget-question-categories";
import type {
  BudgetQuestionMapGroups,
  PublishedBudgetQuestion,
} from "../types/budget-question";
import type { BudgetMapQuestion } from "./budget-map-question-orbit";

const DAILY_QUESTION_LIMIT = 3;

export function getJapanDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = new Map(parts.map((part) => [part.type, part.value]));
  return `${values.get("year")}-${values.get("month")}-${values.get("day")}`;
}

export function selectDailyBudgetQuestions(
  questions: readonly PublishedBudgetQuestion[],
  categorySlug: BudgetQuestionCategorySlug,
  dateKey: string
): BudgetMapQuestion[] {
  const candidates = questions
    .filter((question) => question.categorySlug === categorySlug)
    .map((question) => ({
      question,
      score: stableHash(`${categorySlug}:${question.id}`),
    }))
    .sort(
      (left, right) =>
        left.score - right.score ||
        left.question.id.localeCompare(right.question.id)
    );
  const dayNumber = Math.floor(
    Date.parse(`${dateKey}T00:00:00.000Z`) / 86_400_000
  );
  const rotation = candidates.length === 0 ? 0 : dayNumber % candidates.length;
  const dailyCandidates = [
    ...candidates.slice(rotation),
    ...candidates.slice(0, rotation),
  ];

  const selected: typeof candidates = [];
  const usedCouncilorIds = new Set<string>();
  for (const candidate of dailyCandidates) {
    if (usedCouncilorIds.has(candidate.question.councilor.id)) {
      continue;
    }
    selected.push(candidate);
    usedCouncilorIds.add(candidate.question.councilor.id);
    if (selected.length === DAILY_QUESTION_LIMIT) {
      break;
    }
  }

  if (selected.length < DAILY_QUESTION_LIMIT) {
    for (const candidate of dailyCandidates) {
      if (selected.includes(candidate)) {
        continue;
      }
      selected.push(candidate);
      if (selected.length === DAILY_QUESTION_LIMIT) {
        break;
      }
    }
  }

  return selected.map(({ question }) => ({
    questionId: question.id,
    text: question.name,
    member: question.councilor.displayName,
    photo: question.councilor.iconUrl,
  }));
}

export function buildDailyBudgetQuestionGroups(
  questions: readonly PublishedBudgetQuestion[],
  now = new Date()
): BudgetQuestionMapGroups {
  const dateKey = getJapanDateKey(now);
  return Object.fromEntries(
    BUDGET_QUESTION_CATEGORIES.map((category) => [
      category.slug,
      selectDailyBudgetQuestions(questions, category.slug, dateKey),
    ])
  ) as BudgetQuestionMapGroups;
}

function stableHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
