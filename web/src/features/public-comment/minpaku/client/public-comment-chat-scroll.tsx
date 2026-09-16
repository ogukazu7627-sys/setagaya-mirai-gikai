"use client";

import { useEffect } from "react";
import { useStickToBottomContext } from "use-stick-to-bottom";
import { ConversationScrollButton } from "@/components/ai-elements/conversation";

export function PublicCommentChatScroll({ focused }: { focused: boolean }) {
  const { scrollToBottom, scrollRef } = useStickToBottomContext();
  useEffect(() => {
    if (focused) void scrollToBottom({ animation: "instant" });
  }, [focused, scrollToBottom]);

  useEffect(() => {
    const viewport = scrollRef.current;
    if (!viewport) return;
    // The library observes message height, but keyboard/choices resize the viewport.
    const observer = new ResizeObserver(() => {
      void scrollToBottom({
        animation: "instant",
        preserveScrollPosition: true,
      });
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [scrollRef, scrollToBottom]);

  return <ConversationScrollButton aria-label="最新の会話へ移動" />;
}
