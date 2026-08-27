"use client";

import type { ReactNode } from "react";
import { useRef } from "react";
import type { DifficultyLevelEnum } from "@/features/bill-difficulty/shared/types";
import { LongPressSection } from "@/features/bills/client/components/bill-detail/long-press-section";
import { TextSelectionWrapper } from "@/features/bills/client/components/text-selection-tooltip/text-selection-wrapper";
import {
  ChatButton,
  type ChatButtonRef,
} from "@/features/chat/client/components/chat-button";
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
  const chatButtonRef = useRef<ChatButtonRef>(null);

  if (!defaultQuestion) {
    return children;
  }

  return (
    <>
      <TextSelectionWrapper
        onOpenChat={(selectedText) =>
          chatButtonRef.current?.openWithText(selectedText)
        }
      >
        <div className="mt-8">
          <LongPressSection />
        </div>
        {children}
      </TextSelectionWrapper>
      <ChatButton
        ref={chatButtonRef}
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
    </>
  );
}
