"use client";

import { useChatAuth } from "@/features/chat/client/hooks/use-chat-auth";
import { InterviewSidePanel } from "./interview-side-panel";

export function InterviewChatPageClient({ billId }: { billId: string }) {
  const chatAuth = useChatAuth();

  return (
    <div className="flex h-[calc(100dvh-var(--app-header-layout-offset))] flex-col bg-white">
      <InterviewSidePanel
        authError={chatAuth.error}
        authStatus={chatAuth.status}
        billId={billId}
        isActive
        layout="page"
        onSignInWithGoogle={chatAuth.signInWithGoogle}
      />
    </div>
  );
}
