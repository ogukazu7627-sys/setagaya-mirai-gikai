"use client";

import { useState } from "react";
import { getInterviewReportCompleteLink } from "@/features/interview-config/shared/utils/interview-links";
import { callCompleteApi } from "../utils/interview-api-client";

interface UseInterviewCompletionProps {
  sessionId: string;
}

/**
 * インタビュー完了処理を管理するフック
 */
export function useInterviewCompletion({
  sessionId,
}: UseInterviewCompletionProps) {
  const [isCompleting, setIsCompleting] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);

  const completeInterview = async (isPublic: boolean) => {
    setIsCompleting(true);
    setCompleteError(null);
    try {
      const result = await callCompleteApi({
        sessionId,
        isPublic,
      });
      setIsCompleting(false);
      return result;
    } catch (err) {
      setCompleteError(
        err instanceof Error ? err.message : "Failed to complete interview"
      );
      setIsCompleting(false);
      return null;
    }
  };

  const handleSubmit = async (isPublic: boolean) => {
    const result = await completeInterview(isPublic);
    const reportId = result?.report?.id;
    if (reportId) {
      setIsCompleting(true);
      window.location.href = getInterviewReportCompleteLink(reportId);
    }
  };

  return {
    isCompleting,
    completeError,
    completeInterview,
    handleSubmit,
  };
}
