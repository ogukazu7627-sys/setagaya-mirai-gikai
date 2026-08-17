import type {
  BudgetExplorationData,
  BudgetExplorerStableView,
  BudgetExplorerTransitionTarget,
  BudgetExplorerView,
} from "../types/budget-exploration";
import type { BudgetMapQuestion } from "./budget-map-question-orbit";

const BUDGET_MAP_MESSAGE_SOURCE = "mirai-gikai-budget-map";
const BUDGET_MAP_HOST_MESSAGE_SOURCE = "mirai-gikai-budget-host";
const BUDGET_MAP_MESSAGE_VERSION = 3;
const slugPattern = /^[a-z0-9-]{1,80}$/;
const identityIdPattern = /^[A-Za-z0-9_-]{1,200}$/;
// 質問案件のIDはUUID。親側で遷移先を組み立てる前にここで形を絞る。
const questionIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const datasetIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type BudgetMapAction =
  | { action: "ready" }
  | { action: "dataset-mismatch" }
  | { action: "back" }
  | { action: "focus-search" }
  | { action: "open-official-hierarchy" }
  | { action: "select-category"; categorySlug: string }
  | {
      action: "select-topic";
      categorySlug: string;
      topicSlug: string;
    }
  | {
      action: "select-program";
      budgetProgramIdentityId: string;
    }
  // 渡すのは questionId だけ。遷移先URLの組み立ては親ページの責務。
  | {
      action: "select-question";
      questionId: string;
    }
  | { action: "tutorial-seen" };

export type BudgetMapMessage = BudgetMapAction & {
  source: typeof BUDGET_MAP_MESSAGE_SOURCE;
  version: typeof BUDGET_MAP_MESSAGE_VERSION;
  activeDatasetId: string | null;
};

export type ParsedBudgetMapMessage = BudgetMapAction & {
  activeDatasetId: string | null;
};

export type BudgetMapStableViewReference =
  | { kind: "overview" }
  | { kind: "category"; categorySlug: string }
  | { kind: "topic"; categorySlug: string; topicSlug: string };

export type BudgetMapTransitionTargetReference =
  | BudgetMapStableViewReference
  | { kind: "program"; budgetProgramIdentityId: string };

export type BudgetMapViewReference =
  | BudgetMapStableViewReference
  | {
      kind: "transitioning";
      current: BudgetMapStableViewReference;
      target: BudgetMapTransitionTargetReference;
    };

export type BudgetMapHostMessage = {
  source: typeof BUDGET_MAP_HOST_MESSAGE_SOURCE;
  version: typeof BUDGET_MAP_MESSAGE_VERSION;
  action: "sync-view";
  activeDatasetId: string | null;
  questions: BudgetMapQuestion[];
  view: BudgetMapViewReference;
};

export type ParsedBudgetMapHostMessage = Pick<
  BudgetMapHostMessage,
  "activeDatasetId" | "questions" | "view"
>;

export function createBudgetMapMessage(
  action: BudgetMapAction,
  activeDatasetId: string | null
): BudgetMapMessage {
  return {
    source: BUDGET_MAP_MESSAGE_SOURCE,
    version: BUDGET_MAP_MESSAGE_VERSION,
    activeDatasetId,
    ...action,
  };
}

export function createBudgetMapHostMessage(
  view: BudgetExplorerView,
  activeDatasetId: string | null,
  questions: readonly BudgetMapQuestion[] = []
): BudgetMapHostMessage {
  return {
    source: BUDGET_MAP_HOST_MESSAGE_SOURCE,
    version: BUDGET_MAP_MESSAGE_VERSION,
    action: "sync-view",
    activeDatasetId,
    questions: questions.slice(0, 3),
    view:
      view.kind === "transitioning"
        ? {
            kind: "transitioning",
            current: toStableViewReference(view.current),
            target: toTransitionTargetReference(view.target),
          }
        : toStableViewReference(view),
  };
}

export function parseBudgetMapMessage(
  value: unknown
): ParsedBudgetMapMessage | null {
  if (
    !isRecord(value) ||
    value.source !== BUDGET_MAP_MESSAGE_SOURCE ||
    value.version !== BUDGET_MAP_MESSAGE_VERSION ||
    typeof value.action !== "string" ||
    !isDatasetId(value.activeDatasetId)
  ) {
    return null;
  }

  switch (value.action) {
    case "ready":
    case "dataset-mismatch":
    case "back":
    case "focus-search":
    case "open-official-hierarchy":
    case "tutorial-seen":
      return { action: value.action, activeDatasetId: value.activeDatasetId };
    case "select-category":
      return isSlug(value.categorySlug)
        ? {
            action: value.action,
            categorySlug: value.categorySlug,
            activeDatasetId: value.activeDatasetId,
          }
        : null;
    case "select-topic":
      return isSlug(value.categorySlug) && isSlug(value.topicSlug)
        ? {
            action: value.action,
            categorySlug: value.categorySlug,
            topicSlug: value.topicSlug,
            activeDatasetId: value.activeDatasetId,
          }
        : null;
    case "select-program":
      return typeof value.budgetProgramIdentityId === "string" &&
        identityIdPattern.test(value.budgetProgramIdentityId)
        ? {
            action: value.action,
            budgetProgramIdentityId: value.budgetProgramIdentityId,
            activeDatasetId: value.activeDatasetId,
          }
        : null;
    case "select-question":
      return typeof value.questionId === "string" &&
        questionIdPattern.test(value.questionId)
        ? {
            action: value.action,
            questionId: value.questionId,
            activeDatasetId: value.activeDatasetId,
          }
        : null;
    default:
      return null;
  }
}

export function parseBudgetMapHostMessage(
  value: unknown
): ParsedBudgetMapHostMessage | null {
  if (
    !isRecord(value) ||
    value.source !== BUDGET_MAP_HOST_MESSAGE_SOURCE ||
    value.version !== BUDGET_MAP_MESSAGE_VERSION ||
    value.action !== "sync-view" ||
    !isDatasetId(value.activeDatasetId)
  ) {
    return null;
  }
  const view = parseViewReference(value.view);
  const questions = parseQuestions(value.questions);
  return view && questions
    ? {
        activeDatasetId: value.activeDatasetId,
        questions,
        view,
      }
    : null;
}

export function resolveBudgetMapViewReference(
  exploration: BudgetExplorationData,
  reference: BudgetMapViewReference
): BudgetExplorerView | null {
  if (reference.kind !== "transitioning") {
    return resolveStableViewReference(exploration, reference);
  }

  const current = resolveStableViewReference(exploration, reference.current);
  const target = resolveTransitionTargetReference(
    exploration,
    reference.target
  );
  return current && target
    ? {
        kind: "transitioning",
        current,
        target,
      }
    : null;
}

function toStableViewReference(
  view: BudgetExplorerStableView
): BudgetMapStableViewReference {
  switch (view.kind) {
    case "overview":
      return { kind: "overview" };
    case "category":
      return { kind: "category", categorySlug: view.category.slug };
    case "topic":
      return {
        kind: "topic",
        categorySlug: view.category.slug,
        topicSlug: view.topic.slug,
      };
  }
}

function toTransitionTargetReference(
  target: BudgetExplorerTransitionTarget
): BudgetMapTransitionTargetReference {
  return target.kind === "program"
    ? {
        kind: "program",
        budgetProgramIdentityId: target.budgetProgramIdentityId,
      }
    : toStableViewReference(target);
}

function parseViewReference(value: unknown): BudgetMapViewReference | null {
  if (!isRecord(value) || typeof value.kind !== "string") {
    return null;
  }
  if (value.kind !== "transitioning") {
    return parseStableViewReference(value);
  }

  const current = parseStableViewReference(value.current);
  const target = parseTransitionTargetReference(value.target);
  return current && target
    ? {
        kind: "transitioning",
        current,
        target,
      }
    : null;
}

function parseStableViewReference(
  value: unknown
): BudgetMapStableViewReference | null {
  if (!isRecord(value) || typeof value.kind !== "string") {
    return null;
  }
  switch (value.kind) {
    case "overview":
      return { kind: "overview" };
    case "category":
      return isSlug(value.categorySlug)
        ? { kind: "category", categorySlug: value.categorySlug }
        : null;
    case "topic":
      return isSlug(value.categorySlug) && isSlug(value.topicSlug)
        ? {
            kind: "topic",
            categorySlug: value.categorySlug,
            topicSlug: value.topicSlug,
          }
        : null;
    default:
      return null;
  }
}

function parseTransitionTargetReference(
  value: unknown
): BudgetMapTransitionTargetReference | null {
  if (!isRecord(value) || typeof value.kind !== "string") {
    return null;
  }
  if (value.kind === "program") {
    return typeof value.budgetProgramIdentityId === "string" &&
      identityIdPattern.test(value.budgetProgramIdentityId)
      ? {
          kind: "program",
          budgetProgramIdentityId: value.budgetProgramIdentityId,
        }
      : null;
  }
  return parseStableViewReference(value);
}

function resolveStableViewReference(
  exploration: BudgetExplorationData,
  reference: BudgetMapStableViewReference
): BudgetExplorerStableView | null {
  if (reference.kind === "overview") {
    return { kind: "overview" };
  }
  const category = exploration.categories.find(
    (candidate) => candidate.slug === reference.categorySlug
  );
  if (!category) {
    return null;
  }
  if (reference.kind === "category") {
    return { kind: "category", category };
  }
  const topic = category.topics.find(
    (candidate) => candidate.slug === reference.topicSlug
  );
  return topic ? { kind: "topic", category, topic } : null;
}

function resolveTransitionTargetReference(
  exploration: BudgetExplorationData,
  reference: BudgetMapTransitionTargetReference
): BudgetExplorerTransitionTarget | null {
  if (reference.kind !== "program") {
    return resolveStableViewReference(exploration, reference);
  }
  const exists = exploration.categories.some((category) =>
    category.topics.some((topic) =>
      topic.programs.some(
        (program) =>
          program.budgetProgramIdentityId === reference.budgetProgramIdentityId
      )
    )
  );
  return exists
    ? {
        kind: "program",
        budgetProgramIdentityId: reference.budgetProgramIdentityId,
      }
    : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSlug(value: unknown): value is string {
  return typeof value === "string" && slugPattern.test(value);
}

function isDatasetId(value: unknown): value is string | null {
  return (
    value === null ||
    (typeof value === "string" && datasetIdPattern.test(value))
  );
}

function parseQuestions(value: unknown): BudgetMapQuestion[] | null {
  if (!Array.isArray(value) || value.length > 3) {
    return null;
  }
  const questions = value.map(parseQuestion);
  return questions.every(
    (question): question is BudgetMapQuestion => question !== null
  )
    ? questions
    : null;
}

function parseQuestion(value: unknown): BudgetMapQuestion | null {
  if (
    !isRecord(value) ||
    typeof value.questionId !== "string" ||
    !questionIdPattern.test(value.questionId) ||
    !isDisplayText(value.text, 300) ||
    !isDisplayText(value.member, 100) ||
    typeof value.photo !== "string" ||
    !isSafePhotoUrl(value.photo)
  ) {
    return null;
  }
  return {
    questionId: value.questionId,
    text: value.text.trim(),
    member: value.member.trim(),
    photo: value.photo,
  };
}

function isDisplayText(value: unknown, maxLength: number): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= maxLength
  );
}

function isSafePhotoUrl(value: string): boolean {
  if (value.startsWith("/") && !value.startsWith("//")) {
    return true;
  }
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}
