import { z } from "zod";

export const interviewModeSchema = z.enum(["loop", "bulk", "targeted"]);
export type InterviewMode = z.infer<typeof interviewModeSchema>;
export const deepeningDecisionSchema = z.enum(["continue", "sufficient"]);
export type DeepeningDecision = z.infer<typeof deepeningDecisionSchema>;
export const MAX_INTERVIEW_TURNS = 10;
export const CORE_INTERVIEW_QUESTION_COUNT = 3;
export const interviewJourneySchema = z.enum(["core", "detail"]);
export type InterviewJourney = z.infer<typeof interviewJourneySchema>;
export const completionModeSchema = z.enum(["simple", "detailed"]);
export type CompletionMode = z.infer<typeof completionModeSchema>;
export const checkpointChoiceSchema = z.enum(["simple", "detailed"]);
export type CheckpointChoice = z.infer<typeof checkpointChoiceSchema>;
export type InterviewQuestion = {
  id: string;
  topic: string;
  premise: string;
  ask: string;
  followUp: string;
  quickReplies: readonly string[];
  targetAudience?: string;
};
export const eligibilitySchema = z.object({
  questionId: z.string(),
  verdict: z.enum(["eligible", "ineligible", "unknown"]),
  evidenceMessageId: z.string().nullable(),
});
export const interviewStateSchema = z.object({
  version: z.literal(1),
  mode: interviewModeSchema,
  journey: interviewJourneySchema.default("core"),
  checkpoint: z.literal("after_core").nullable().default(null),
  completionMode: completionModeSchema.nullable().default(null),
  targetAudiences: z.record(z.string(), z.string()).default({}),
  phase: z.enum(["questions", "deepening", "done"]),
  currentQuestionId: z.string().nullable(),
  kind: z.enum(["base", "followup"]),
  answered: z.array(z.string()),
  completed: z.array(z.string()),
  followUpAnswers: z.record(z.string(), z.number().int().min(0).max(2)),
  skipped: z.record(
    z.string(),
    z.enum(["ineligible", "unknown", "declined", "covered"])
  ),
  eligibility: z.array(eligibilitySchema),
  paused: z.boolean(),
  quickReplies: z.array(z.string()),
  turnCount: z.number().int().min(0).default(0),
});
export type InterviewState = z.infer<typeof interviewStateSchema>;
export type Eligibility = z.infer<typeof eligibilitySchema>;
export type InterviewAction = "answer" | "skip" | "finish" | "resume";
export type InterviewProgress = {
  percentage: number;
  currentTopic: string | null;
  remainingQuestionRange: { min: number; max: number } | null;
  paused: boolean;
  checkpoint: "after_core" | null;
};

export function initialInterviewState(mode: InterviewMode): InterviewState {
  return {
    version: 1,
    mode,
    journey: "core",
    checkpoint: null,
    completionMode: null,
    targetAudiences: {},
    phase: "questions",
    currentQuestionId: null,
    kind: "base",
    answered: [],
    completed: [],
    followUpAnswers: {},
    skipped: {},
    eligibility: [],
    paused: false,
    quickReplies: [],
    turnCount: 0,
  };
}

function finishInterview(state: InterviewState) {
  state.phase = "done";
  state.currentQuestionId = null;
  state.quickReplies = [];
  state.paused = false;
  state.checkpoint = null;
  if (!state.completionMode)
    state.completionMode = state.journey === "core" ? "simple" : "detailed";
  return state;
}

function coreQuestionIds(questions: readonly InterviewQuestion[]) {
  return new Set(
    questions
      .slice(0, CORE_INTERVIEW_QUESTION_COUNT)
      .map((question) => question.id)
  );
}

function enterCoreCheckpoint(state: InterviewState) {
  state.checkpoint = "after_core";
  state.currentQuestionId = null;
  state.kind = "base";
  state.quickReplies = [];
  state.paused = false;
  return state;
}

function selectNext(
  state: InterviewState,
  questions: readonly InterviewQuestion[]
) {
  const coreIds = coreQuestionIds(questions);
  const candidates =
    state.journey === "core"
      ? questions.slice(0, CORE_INTERVIEW_QUESTION_COUNT)
      : questions;
  for (const question of candidates) {
    if (state.completed.includes(question.id) || state.skipped[question.id])
      continue;
    if (
      state.mode === "bulk" &&
      state.phase === "questions" &&
      state.answered.includes(question.id)
    )
      continue;
    if (state.mode === "targeted" && question.targetAudience) {
      const verdict =
        state.eligibility.find((item) => item.questionId === question.id)
          ?.verdict ?? "unknown";
      if (verdict === "ineligible") {
        state.skipped[question.id] = verdict;
        continue;
      }
    }
    state.currentQuestionId = question.id;
    state.kind = state.phase === "deepening" ? "followup" : "base";
    state.quickReplies =
      state.kind === "base" ? [...question.quickReplies] : [];
    return state;
  }
  if (
    state.mode === "bulk" &&
    state.phase === "questions" &&
    state.answered.some(
      (id) =>
        !state.skipped[id] &&
        !state.completed.includes(id) &&
        (state.journey === "detail" || !coreIds.has(id))
    )
  ) {
    state.phase = "deepening";
    return selectNext(state, questions);
  }
  if (state.journey === "core") return enterCoreCheckpoint(state);
  state.phase = "done";
  state.currentQuestionId = null;
  state.quickReplies = [];
  return state;
}

// Only the server advances the cursor. A follow-up is counted after its answer.
export function advanceInterview(
  previous: InterviewState,
  questions: readonly InterviewQuestion[],
  action: InterviewAction,
  eligibility: Eligibility[] = [],
  deepeningDecision: DeepeningDecision = "continue",
  alreadyCoveredQuestionIds: string[] = []
): InterviewState {
  const state = structuredClone(previous);
  if (state.phase === "done") return state;
  if (state.checkpoint) return state;
  state.eligibility = [
    ...state.eligibility.filter(
      (old) => !eligibility.some((item) => item.questionId === old.questionId)
    ),
    ...eligibility,
  ];
  if (action === "finish") {
    return finishInterview(state);
  }
  if (action === "resume") {
    state.paused = false;
    return state;
  }
  if (state.paused) return state;
  const id = state.currentQuestionId;
  if (!id) return selectNext(state, questions);
  const current = questions.find((q) => q.id === id);
  const validQuestionIds = new Set(questions.map((question) => question.id));
  for (const questionId of new Set(alreadyCoveredQuestionIds)) {
    if (
      validQuestionIds.has(questionId) &&
      questionId !== id &&
      !state.completed.includes(questionId) &&
      !state.skipped[questionId]
    ) {
      state.skipped[questionId] = "covered";
    }
  }
  const targetedIneligible =
    state.mode === "targeted" &&
    current?.targetAudience &&
    state.eligibility.some(
      (item) => item.questionId === id && item.verdict === "ineligible"
    );
  // An eligibility-based skip is an internal transition, not a user answer.
  // Do not consume one of the ten user-turn budget slots for it.
  if (!targetedIneligible && (action === "answer" || action === "skip"))
    state.turnCount += 1;
  if (targetedIneligible) {
    state.skipped[id] = "ineligible";
  } else if (action === "skip") {
    state.skipped[id] = "declined";
  } else {
    if (!state.answered.includes(id)) state.answered.push(id);
    if (state.kind === "followup") {
      state.followUpAnswers[id] = Math.min(
        2,
        (state.followUpAnswers[id] ?? 0) + 1
      );
    }
    // A hard upper bound keeps the interview short even if the model keeps
    // asking for more detail. The tenth answer is retained, but no eleventh
    // fixed question or follow-up is generated.
    if (state.turnCount >= MAX_INTERVIEW_TURNS) {
      if (!state.completed.includes(id)) state.completed.push(id);
      return finishInterview(state);
    }
    if (state.journey === "core") {
      if (!state.completed.includes(id)) state.completed.push(id);
    } else if (state.mode === "bulk" && state.phase === "questions") {
      // Bulk mode asks every base question first. A sufficient base answer is
      // complete; only topics that still need detail enter the later phase.
      if (deepeningDecision === "sufficient" && !state.completed.includes(id)) {
        state.completed.push(id);
      }
    } else {
      if (
        deepeningDecision === "continue" &&
        (state.followUpAnswers[id] ?? 0) < 2
      ) {
        state.kind = "followup";
        state.quickReplies = [];
        return state;
      }
      if (!state.completed.includes(id)) state.completed.push(id);
    }
  }
  if (state.turnCount >= MAX_INTERVIEW_TURNS) {
    if (action === "answer" && !state.skipped[id]) {
      if (!state.completed.includes(id)) state.completed.push(id);
    }
    return finishInterview(state);
  }
  return selectNext(state, questions);
}

export function chooseInterviewPath(
  previous: InterviewState,
  questions: readonly InterviewQuestion[],
  choice: CheckpointChoice
) {
  const state = structuredClone(previous);
  if (state.phase === "done" || state.checkpoint !== "after_core") return state;
  state.checkpoint = null;
  if (choice === "simple") {
    state.completionMode = "simple";
    return finishInterview(state);
  }
  state.journey = "detail";
  state.completionMode = "detailed";
  return selectNext(state, questions);
}

export function composeInterviewMessage(
  acknowledgement: string,
  question: InterviewQuestion
) {
  return [acknowledgement.trim(), question.premise, question.ask]
    .filter(Boolean)
    .join("\n\n");
}

export function interviewProgress(
  state: InterviewState,
  questions: readonly InterviewQuestion[]
): InterviewProgress {
  const question = questions.find(
    (item) => item.id === state.currentQuestionId
  );
  const visibleQuestions =
    state.journey === "core"
      ? questions.slice(0, CORE_INTERVIEW_QUESTION_COUNT)
      : questions;
  const active = visibleQuestions.filter((item) => !state.skipped[item.id]);
  const done = state.phase === "done";
  const remainingBaseQuestions = active.filter(
    (item) =>
      !state.completed.includes(item.id) && !state.answered.includes(item.id)
  ).length;
  const requiredFollowUps = active.filter(
    (item) =>
      !state.completed.includes(item.id) && state.answered.includes(item.id)
  ).length;
  const remainingMinimum = remainingBaseQuestions + requiredFollowUps;
  const possibleAdditionalFollowUps = active.reduce((sum, item) => {
    if (state.completed.includes(item.id)) return sum;
    if (!state.answered.includes(item.id)) return sum + 2;
    return sum + Math.max(0, 1 - (state.followUpAnswers[item.id] ?? 0));
  }, 0);
  // This is an estimate for the UI, not a hard turn quota. In the core stage
  // it shows only the three fixed questions; detail mode includes a small
  // allowance for follow-ups while the server still applies the hard cap.
  const remainingMaximum =
    state.journey === "core"
      ? remainingMinimum
      : Math.max(
          remainingMinimum,
          Math.min(
            Math.max(0, MAX_INTERVIEW_TURNS - state.turnCount),
            remainingMinimum + Math.min(3, possibleAdditionalFollowUps)
          )
        );
  const completedTopicUnits = active.reduce((sum, item) => {
    if (state.completed.includes(item.id)) return sum + 1;
    if (!state.answered.includes(item.id)) return sum;
    return sum + (1 + (state.followUpAnswers[item.id] ?? 0)) / 3;
  }, 0);
  // Targeted mode never exposes an inferred skip count or changing denominator.
  const targeted = state.mode === "targeted";
  return {
    percentage: done
      ? 100
      : targeted
        ? 0
        : Math.min(
            95,
            (completedTopicUnits / Math.max(1, active.length)) * 100
          ),
    currentTopic: state.paused
      ? "相談・支援のご案内"
      : state.checkpoint
        ? "簡易版か詳細版を選択"
        : done
          ? "インタビュー終了"
          : (question?.topic ?? null),
    remainingQuestionRange:
      done || targeted || state.checkpoint
        ? null
        : { min: remainingMinimum, max: remainingMaximum },
    paused: state.paused,
    checkpoint: state.checkpoint,
  };
}

// Existing sessions retain answered topics; only unfinished topics enter the new flow.
export function restoreInterviewState(
  saved: unknown,
  mode: InterviewMode,
  questions: readonly InterviewQuestion[],
  messages: readonly { role: string; question_id?: string | null }[],
  hasDraft = false
): InterviewState {
  if (saved !== null && saved !== undefined) {
    const parsed = interviewStateSchema.parse(saved);
    const raw = saved as Record<string, unknown>;
    if (!("journey" in raw)) {
      const coreIds = coreQuestionIds(questions);
      const hasDetailProgress =
        parsed.phase === "deepening" ||
        (parsed.currentQuestionId !== null &&
          !coreIds.has(parsed.currentQuestionId)) ||
        parsed.answered.some((id) => !coreIds.has(id)) ||
        parsed.completed.some((id) => !coreIds.has(id));
      parsed.journey = hasDetailProgress ? "detail" : "core";
    }
    if (
      typeof saved !== "object" ||
      saved === null ||
      !("turnCount" in saved)
    ) {
      parsed.turnCount = Math.min(
        MAX_INTERVIEW_TURNS,
        parsed.answered.length +
          Object.values(parsed.followUpAnswers).reduce(
            (sum, count) => sum + count,
            0
          ) +
          Object.values(parsed.skipped).filter(
            (reason) => reason === "declined"
          ).length
      );
    }
    return parsed;
  }
  const state = initialInterviewState(mode);
  state.targetAudiences = Object.fromEntries(
    questions
      .filter((q) => q.targetAudience)
      .map((q) => [q.id, q.targetAudience as string])
  );
  state.answered = questions
    .filter((q) =>
      messages.some((m) => m.role === "user" && m.question_id === q.id)
    )
    .map((q) => q.id);
  state.completed = [...state.answered];
  for (const id of state.completed) state.followUpAnswers[id] = 2;
  if (hasDraft || state.completed.length === questions.length)
    return advanceInterview(state, questions, "finish");
  return selectNext(state, questions);
}

export function canCreateInterviewDraft(
  saved: unknown,
  legacyAnswers: number,
  total: number
) {
  return saved == null
    ? legacyAnswers >= total
    : interviewStateSchema.parse(saved).phase === "done" && legacyAnswers > 0;
}
