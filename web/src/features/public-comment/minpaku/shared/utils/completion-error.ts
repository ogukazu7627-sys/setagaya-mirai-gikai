const COMPLETION_FAILURE_REASONS = new Set([
  "public_comment_invalid_consent",
  "public_comment_invalid_event_invitation",
  "public_comment_not_found",
  "public_comment_campaign_not_found",
  "public_comment_draft_required",
  "public_comment_completed",
]);

// Database messages and details can contain user input. Only emit known codes.
export function getCompletionErrorDiagnostic(error: {
  code: string;
  message: string;
}) {
  return {
    code: /^(?:[A-Z0-9]{5}|PGRST\d{3})$/.test(error.code)
      ? error.code
      : "unknown",
    reason: COMPLETION_FAILURE_REASONS.has(error.message)
      ? error.message
      : "database_error",
  };
}
