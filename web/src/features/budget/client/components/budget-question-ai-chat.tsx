"use client";

import type { ReactNode } from "react";
import type { DifficultyLevelEnum } from "@/features/bill-difficulty/shared/types";
import {
  CouncilQuestionAiAskButton,
  CouncilQuestionAiChatProvider,
  type CouncilQuestionChatTarget,
} from "@/features/bills/client/components/question-collection/council-question-ai-chat";

export function BudgetQuestionAiChatProvider({
  children,
  defaultQuestion,
  difficultyLevel,
}: {
  children: ReactNode;
  defaultQuestion?: CouncilQuestionChatTarget;
  difficultyLevel: DifficultyLevelEnum;
}) {
  return (
    <CouncilQuestionAiChatProvider
      defaultQuestion={defaultQuestion}
      difficultyLevel={difficultyLevel}
      kind="budget"
    >
      {children}
    </CouncilQuestionAiChatProvider>
  );
}

export { CouncilQuestionAiAskButton as BudgetQuestionAiAskButton };
