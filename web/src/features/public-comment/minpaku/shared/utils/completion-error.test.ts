import { describe, expect, it } from "vitest";
import { getCompletionErrorDiagnostic } from "./completion-error";

describe("completion error diagnostics", () => {
  it("keeps actionable consent failure and schema error codes", () => {
    expect(
      getCompletionErrorDiagnostic({
        code: "P0001",
        message: "public_comment_invalid_consent",
      })
    ).toEqual({ code: "P0001", reason: "public_comment_invalid_consent" });
    expect(
      getCompletionErrorDiagnostic({
        code: "PGRST202",
        message: "function missing",
      })
    ).toEqual({ code: "PGRST202", reason: "database_error" });
  });

  it("never includes email addresses, answer text or database details", () => {
    const error = {
      code: "unexpected user@example.test",
      message: "public_comment_invalid_consent: private answer",
      details: "user@example.test / private answer",
      hint: "private session data",
    };
    expect(getCompletionErrorDiagnostic(error)).toEqual({
      code: "unknown",
      reason: "database_error",
    });
  });
});
