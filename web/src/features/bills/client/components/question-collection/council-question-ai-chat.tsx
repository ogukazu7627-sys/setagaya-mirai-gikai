"use client";

import type { ReactNode } from "react";
import type { DifficultyLevelEnum } from "@/features/bill-difficulty/shared/types";
import { ChatButton } from "@/features/chat/client/components/chat-button";
import type { ChatPageContext } from "@/features/chat/shared/types/page-context";

export type CouncilQuestionChatTarget = {
  id: string;
  name: string;
};

export type CouncilQuestionCollectionKind = "budget" | "general";

function getQuestionPageType(
  kind: CouncilQuestionCollectionKind
): ChatPageContext["type"] {
  return kind === "budget" ? "budget-question" : "general-question";
}

export function CouncilQuestionAiChatProvider({
  children,
  defaultQuestion,
  difficultyLevel,
  kind,
}: {
  children: ReactNode;
  defaultQuestion?: CouncilQuestionChatTarget;
  difficultyLevel: DifficultyLevelEnum;
  kind: CouncilQuestionCollectionKind;
}) {
  return (
    <>
      {children}
      {defaultQuestion ? (
        <ChatButton
          key={defaultQuestion.id}
          billContext={{
            id: defaultQuestion.id,
            interview_enabled: false,
            item_type: "question",
            name: defaultQuestion.name,
          }}
          difficultyLevel={difficultyLevel}
          hasInterviewConfig={false}
          pageContext={{ type: getQuestionPageType(kind) }}
          showLauncher
        />
      ) : null}
    </>
  );
}
