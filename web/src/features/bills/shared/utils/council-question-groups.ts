type CouncilQuestionLike = {
  id: string;
  councilor: {
    id: string;
  };
};

export type CouncilQuestionCouncilorGroup<
  TQuestion extends CouncilQuestionLike,
> = {
  councilor: TQuestion["councilor"];
  questions: [TQuestion, ...TQuestion[]];
};

export function groupCouncilQuestionsByCouncilor<
  TQuestion extends CouncilQuestionLike,
>(questions: readonly TQuestion[]): CouncilQuestionCouncilorGroup<TQuestion>[] {
  const groups: CouncilQuestionCouncilorGroup<TQuestion>[] = [];
  const groupsByCouncilorId = new Map<
    string,
    CouncilQuestionCouncilorGroup<TQuestion>
  >();

  for (const question of questions) {
    const existingGroup = groupsByCouncilorId.get(question.councilor.id);
    if (existingGroup) {
      existingGroup.questions.push(question);
      continue;
    }

    const group: CouncilQuestionCouncilorGroup<TQuestion> = {
      councilor: question.councilor,
      questions: [question],
    };
    groupsByCouncilorId.set(question.councilor.id, group);
    groups.push(group);
  }

  return groups;
}

export function prioritizeFocusedCouncilQuestion<
  TQuestion extends CouncilQuestionLike,
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
