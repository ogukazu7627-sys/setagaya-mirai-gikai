"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

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
    const timer = window.setTimeout(() => setReady(true), 5_000);
    return () => window.clearTimeout(timer);
  }, [active]);

  if (!active || !ready) return null;

  return (
    <div
      role="group"
      aria-label="回答の候補"
      className="flex max-h-[min(5.5rem,25cqh)] gap-2 overflow-auto overscroll-contain px-4 py-2 animate-fade-in motion-reduce:animate-none"
    >
      {replies.map((reply) => (
        <Button
          key={reply}
          type="button"
          variant="outline"
          onClick={() => onSelect(reply)}
          className="h-auto min-h-11 max-w-[min(20rem,80vw)] whitespace-normal break-words border-primary-accent px-3 py-2 text-sm font-medium text-primary-accent shadow-none"
        >
          {reply}
        </Button>
      ))}
    </div>
  );
}
