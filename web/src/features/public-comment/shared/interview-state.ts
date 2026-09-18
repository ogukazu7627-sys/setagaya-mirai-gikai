import { z } from "zod";

export const interviewModeSchema = z.enum(["loop", "bulk", "targeted"]);
export type InterviewMode = z.infer<typeof interviewModeSchema>;
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
  targetAudiences: z.record(z.string(), z.string()).default({}),
  phase: z.enum(["questions", "deepening", "done"]),
  currentQuestionId: z.string().nullable(),
  kind: z.enum(["base", "followup"]),
  answered: z.array(z.string()),
  completed: z.array(z.string()),
  followUpAnswers: z.record(z.string(), z.number().int().min(0).max(2)),
  skipped: z.record(z.string(), z.enum(["ineligible", "unknown", "declined"])),
  eligibility: z.array(eligibilitySchema),
  paused: z.boolean(),
  quickReplies: z.array(z.string()),
});
export type InterviewState = z.infer<typeof interviewStateSchema>;
export type Eligibility = z.infer<typeof eligibilitySchema>;
export type InterviewAction = "answer" | "skip" | "finish" | "resume";
export type InterviewProgress = {
  percentage: number;
  currentTopic: string | null;
  remainingQuestionRange: { min: number; max: number } | null;
  paused: boolean;
};

export function initialInterviewState(mode: InterviewMode): InterviewState {
  return {
    version: 1,
    mode,
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
  };
}

function selectNext(
  state: InterviewState,
  questions: readonly InterviewQuestion[]
) {
  for (const question of questions) {
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
    state.answered.some((id) => !state.skipped[id])
  ) {
    state.phase = "deepening";
    return selectNext(state, questions);
  }
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
  eligibility: Eligibility[] = []
): InterviewState {
  const state = structuredClone(previous);
  if (state.phase === "done") return state;
  state.eligibility = [
    ...state.eligibility.filter(
      (old) => !eligibility.some((item) => item.questionId === old.questionId)
    ),
    ...eligibility,
  ];
  if (action === "finish") {
    state.phase = "done";
    state.currentQuestionId = null;
    state.quickReplies = [];
    state.paused = false;
    return state;
  }
  if (action === "resume") {
    state.paused = false;
    return state;
  }
  if (state.paused) return state;
  const id = state.currentQuestionId;
  if (!id) return selectNext(state, questions);
  const current = questions.find((q) => q.id === id);
  if (
    state.mode === "targeted" &&
    current?.targetAudience &&
    state.eligibility.some(
      (item) => item.questionId === id && item.verdict === "ineligible"
    )
  ) {
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
    if (!(state.mode === "bulk" && state.phase === "questions")) {
      if ((state.followUpAnswers[id] ?? 0) < 2) {
        state.kind = "followup";
        state.quickReplies = [];
        return state;
      }
      state.completed.push(id);
    }
  }
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
  const active = questions.filter((item) => !state.skipped[item.id]);
  const done = state.phase === "done";
  const remaining = active.reduce((sum, item) => {
    if (state.completed.includes(item.id)) return sum;
    return (
      sum +
      (state.answered.includes(item.id) ? 0 : 1) +
      2 -
      (state.followUpAnswers[item.id] ?? 0)
    );
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
            ((active.length * 3 - remaining) / Math.max(1, active.length * 3)) *
              100
          ),
    currentTopic: state.paused
      ? "相談・支援のご案内"
      : done
        ? "インタビュー終了"
        : (question?.topic ?? null),
    remainingQuestionRange:
      done || targeted ? null : { min: remaining, max: remaining },
    paused: state.paused,
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
  if (saved !== null && saved !== undefined)
    return interviewStateSchema.parse(saved);
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
