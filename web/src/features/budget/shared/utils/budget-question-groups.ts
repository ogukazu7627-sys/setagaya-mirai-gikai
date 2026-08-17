import type { PublishedBudgetQuestion } from "../types/budget-question";

export type BudgetQuestionCouncilorGroup<
  TQuestion extends PublishedBudgetQuestion,
> = {
  councilor: TQuestion["councilor"];
  questions: [TQuestion, ...TQuestion[]];
};

export function groupBudgetQuestionsByCouncilor<
  TQuestion extends PublishedBudgetQuestion,
>(questions: readonly TQuestion[]): BudgetQuestionCouncilorGroup<TQuestion>[] {
  const groups: BudgetQuestionCouncilorGroup<TQuestion>[] = [];
  const groupsByCouncilorId = new Map<
    string,
    BudgetQuestionCouncilorGroup<TQuestion>
  >();

  for (const question of questions) {
    const existingGroup = groupsByCouncilorId.get(question.councilor.id);
    if (existingGroup) {
      existingGroup.questions.push(question);
      continue;
    }

    const group: BudgetQuestionCouncilorGroup<TQuestion> = {
      councilor: question.councilor,
      questions: [question],
    };
    groupsByCouncilorId.set(question.councilor.id, group);
    groups.push(group);
  }

  return groups;
}

export function prioritizeFocusedBudgetQuestion<
  TQuestion extends PublishedBudgetQuestion,
>(
  questions: readonly TQuestion[],
  focusQuestionId?: string | null
): TQuestion[] {
  if (!focusQuestionId) {
    return [...questions];
  }

  const focusedIndex = questions.findIndex(
    (question) => question.id === focusQuestionId
  );
  if (focusedIndex <= 0) {
    return [...questions];
  }

  return [
    questions[focusedIndex],
    ...questions.slice(0, focusedIndex),
    ...questions.slice(focusedIndex + 1),
  ];
}
