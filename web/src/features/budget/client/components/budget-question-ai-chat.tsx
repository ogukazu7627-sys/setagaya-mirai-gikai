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

type BudgetQuestionChatTarget = {
  id: string;
  name: string;
};

type BudgetQuestionChatRequest = {
  sequence: number;
  target: BudgetQuestionChatTarget;
};

type BudgetQuestionAiChatContextValue = {
  openQuestionChat: (target: BudgetQuestionChatTarget) => void;
};

const BudgetQuestionAiChatContext =
  createContext<BudgetQuestionAiChatContextValue | null>(null);

export function BudgetQuestionAiChatProvider({
  children,
  difficultyLevel,
}: {
  children: ReactNode;
  difficultyLevel: DifficultyLevelEnum;
}) {
  const chatButtonRef = useRef<ChatButtonRef>(null);
  const [request, setRequest] = useState<BudgetQuestionChatRequest | null>(
    null
  );

  const openQuestionChat = useCallback((target: BudgetQuestionChatTarget) => {
    setRequest((current) => ({
      sequence: (current?.sequence ?? 0) + 1,
      target,
    }));
  }, []);

  useEffect(() => {
    if (request) {
      chatButtonRef.current?.open();
    }
  }, [request]);

  return (
    <BudgetQuestionAiChatContext.Provider value={{ openQuestionChat }}>
      {children}
      {request ? (
        <ChatButton
          key={request.target.id}
          ref={chatButtonRef}
          billContext={{
            id: request.target.id,
            interview_enabled: false,
            item_type: "question",
            name: request.target.name,
          }}
          difficultyLevel={difficultyLevel}
          hasInterviewConfig={false}
          pageContext={{ type: "budget-question" }}
          showLauncher={false}
        />
      ) : null}
    </BudgetQuestionAiChatContext.Provider>
  );
}

export function BudgetQuestionAiAskButton({
  questionId,
  questionName,
}: {
  questionId: string;
  questionName: string;
}) {
  const context = useContext(BudgetQuestionAiChatContext);
  if (!context) {
    throw new Error(
      "BudgetQuestionAiAskButton must be used within BudgetQuestionAiChatProvider"
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
