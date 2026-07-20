import { describe, expect, it } from "vitest";
import {
  DEFAULT_PETITION_INTERVIEW_QUESTIONS,
  DEFAULT_PETITION_INTERVIEW_THEMES,
} from "./default-petition-interview-template";

describe("default petition interview template", () => {
  it("contains the four petition draft questions in order", () => {
    expect(DEFAULT_PETITION_INTERVIEW_QUESTIONS).toHaveLength(4);
    expect(
      DEFAULT_PETITION_INTERVIEW_QUESTIONS.map(
        (question) => question.question_order
      )
    ).toEqual([1, 2, 3, 4]);
    expect(DEFAULT_PETITION_INTERVIEW_QUESTIONS[0]?.question).toContain(
      "一番お願いしたいこと"
    );
    expect(DEFAULT_PETITION_INTERVIEW_QUESTIONS[3]?.question).toContain(
      "請願事項"
    );
  });

  it("keeps petition document fields visible in the themes", () => {
    expect(DEFAULT_PETITION_INTERVIEW_THEMES).toEqual([
      "請願の件名と要旨",
      "請願理由",
      "地域・公益への影響",
      "請願事項",
    ]);
  });
});
