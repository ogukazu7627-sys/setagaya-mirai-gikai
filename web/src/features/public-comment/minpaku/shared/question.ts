type FixedQuestion = {
  context: string;
  question: string;
};

export function composeMinpakuInterviewMessage(
  acknowledgement: string,
  question: FixedQuestion
) {
  return [acknowledgement.trim(), question.context, question.question]
    .filter(Boolean)
    .join("\n\n");
}
