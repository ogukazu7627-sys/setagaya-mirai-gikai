"use client";

import { useCallback, useRef, useState } from "react";
import type {
  InterviewAction,
  InterviewMode,
  InterviewProgress,
} from "../interview-state";

export type InterviewMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  question_id?: string | null;
};
type ConversationSnapshot = {
  messages: InterviewMessage[];
  revision: number;
  quickReplies: string[];
  progress: InterviewProgress;
  mode: InterviewMode;
};
type PendingTurn = {
  requestId: string;
  revision: number;
  content: string;
  action: InterviewAction;
};

export function useInterviewConversation(params: {
  sessionId: string | null;
  apiBasePath: string;
  busy: boolean;
  setBusy: (busy: boolean) => void;
  setError: (error: string | null) => void;
  onDone: () => void;
}) {
  const [messages, setMessages] = useState<InterviewMessage[]>([]);
  const [answer, setAnswer] = useState("");
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  const [progress, setProgress] = useState<InterviewProgress>({
    percentage: 0,
    currentTopic: null,
    remainingQuestionRange: null,
    paused: false,
  });
  const [mode, setMode] = useState<InterviewMode>("loop");
  const revision = useRef(0);
  const pending = useRef<PendingTurn | null>(null);
  const sending = useRef(false);
  const loadConversation = useCallback((data: ConversationSnapshot) => {
    setMessages(data.messages ?? []);
    setQuickReplies(data.quickReplies ?? []);
    setProgress(data.progress);
    setMode(data.mode);
    revision.current = data.revision;
    pending.current = null;
  }, []);

  const sendAnswer = async (
    value = answer,
    action: InterviewAction = "answer"
  ) => {
    const content = action === "answer" ? value.trim() : "";
    if (
      !params.sessionId ||
      params.busy ||
      sending.current ||
      (action === "answer" && !content)
    )
      return;
    // A failed response might already be committed. Always replay that exact turn first.
    if (
      pending.current &&
      (pending.current.content !== content || pending.current.action !== action)
    ) {
      params.setError(
        "前の送信結果を確認できていません。同じ内容で再送するか、ページを再読み込みしてください。"
      );
      return;
    }
    const turn = pending.current ?? {
      requestId: crypto.randomUUID(),
      revision: revision.current,
      content,
      action,
    };
    pending.current = turn;
    sending.current = true;
    params.setBusy(true);
    params.setError(null);
    setAnswer("");
    setQuickReplies([]);
    if (action === "answer")
      setMessages((current) => [
        ...current,
        { id: turn.requestId, role: "user", content },
      ]);
    try {
      const response = await fetch(`${params.apiBasePath}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: params.sessionId, ...turn }),
      });
      const data = await response.json();
      if (!response.ok) {
        // 4xx is an explicit rejection, unlike a lost response or uncertain server failure.
        if (response.status >= 400 && response.status < 500)
          pending.current = null;
        throw new Error(data.error ?? "回答を送信できませんでした");
      }
      revision.current = data.revision;
      pending.current = null;
      setMessages((current) => {
        const kept =
          data.userMessageStored === false
            ? current.filter((m) => m.id !== turn.requestId)
            : current;
        return data.message && !kept.some((m) => m.id === data.message.id)
          ? [...kept, data.message]
          : kept;
      });
      setProgress(data.progress);
      setMode(data.mode);
      setQuickReplies(data.quickReplies ?? []);
      if (data.nextStage === "draft") params.onDone();
    } catch (error) {
      setMessages((current) => current.filter((m) => m.id !== turn.requestId));
      if (action === "answer") setAnswer(content);
      params.setError(
        error instanceof Error ? error.message : "回答を送信できませんでした"
      );
    } finally {
      sending.current = false;
      params.setBusy(false);
    }
  };
  return {
    messages,
    answer,
    setAnswer,
    quickReplies,
    progress,
    mode,
    loadConversation,
    sendAnswer,
  };
}
