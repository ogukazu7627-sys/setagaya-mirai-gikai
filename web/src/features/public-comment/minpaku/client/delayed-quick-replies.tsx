"use client";

import { useEffect, useState } from "react";
import { QuickReplyButtons } from "@/features/interview-session/client/components/quick-reply-buttons";

export function DelayedQuickReplies({
  replies,
  disabled,
  onSelect,
}: {
  replies: string[];
  disabled: boolean;
  onSelect: (reply: string) => void;
}) {
  const [ready, setReady] = useState(false);
  const active = !disabled && replies.length > 0;

  useEffect(() => {
    setReady(false);
    if (!active) return;
    const timer = window.setTimeout(() => setReady(true), 15_000);
    return () => window.clearTimeout(timer);
  }, [active]);

  if (!active || !ready) return null;

  return (
    <div className="animate-fade-in motion-reduce:animate-none motion-reduce:[&_button]:animate-none">
      <QuickReplyButtons replies={replies} onSelect={onSelect} />
    </div>
  );
}
