"use client";

import type { DifficultyLevelEnum } from "@/features/bill-difficulty/shared/types";
import { ChatButton } from "./chat-button";

type CouncilChatClientProps = {
  currentDifficulty: DifficultyLevelEnum;
  bills: Array<{
    id: string;
    name: string;
    summary?: string;
    tags?: string[];
  }>;
};

export function CouncilChatClient({
  currentDifficulty,
  bills,
}: CouncilChatClientProps) {
  return (
    <ChatButton
      difficultyLevel={currentDifficulty}
      pageContext={{
        type: "council",
        bills,
      }}
    />
  );
}
