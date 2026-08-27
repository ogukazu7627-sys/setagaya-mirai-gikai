"use client";

import { MessageCircleQuestion } from "lucide-react";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import type { DifficultyLevelEnum } from "@/features/bill-difficulty/shared/types";
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

type CouncilQuestionAiChatContextValue = {
  openQuestionChat: (target: CouncilQuestionChatTarget) => void;
};

const CouncilQuestionAiChatContext =
  createContext<CouncilQuestionAiChatContextValue | null>(null);

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
  const [activeQuestion, setActiveQuestion] =
    useState<CouncilQuestionChatTarget | null>(defaultQuestion ?? null);
  const [openSequence, setOpenSequence] = useState(0);

  useEffect(() => {
    setActiveQuestion(defaultQuestion ?? null);
  }, [defaultQuestion]);

  const openQuestionChat = useCallback((target: CouncilQuestionChatTarget) => {
    setActiveQuestion(target);
    setOpenSequence((current) => current + 1);
  }, []);

  useEffect(() => {
    if (openSequence > 0) {
      chatButtonRef.current?.open();
    }
  }, [openSequence]);

  return (
    <CouncilQuestionAiChatContext.Provider value={{ openQuestionChat }}>
      {children}
      {activeQuestion ? (
        <ChatButton
          key={activeQuestion.id}
          ref={chatButtonRef}
          billContext={{
            id: activeQuestion.id,
            interview_enabled: false,
            item_type: "question",
            name: activeQuestion.name,
          }}
          difficultyLevel={difficultyLevel}
          hasInterviewConfig={false}
          pageContext={{ type: getQuestionPageType(kind) }}
          showLauncher={Boolean(defaultQuestion)}
        />
      ) : null}
    </CouncilQuestionAiChatContext.Provider>
  );
}

export function CouncilQuestionAiAskButton({
  questionId,
  questionName,
}: {
  questionId: string;
  questionName: string;
}) {
  const context = useContext(CouncilQuestionAiChatContext);
  if (!context) {
    throw new Error(
      "CouncilQuestionAiAskButton must be used within CouncilQuestionAiChatProvider"
    );
  }

  return (
    <Button
      aria-label={`「${questionName}」についてAIに聞く`}
      aria-haspopup="dialog"
      className="min-h-11"
      onClick={() =>
        context.openQuestionChat({ id: questionId, name: questionName })
      }
      type="button"
      variant="outline"
    >
      <MessageCircleQuestion aria-hidden="true" className="size-4" />
      この質問についてAIに聞く
    </Button>
  );
}
