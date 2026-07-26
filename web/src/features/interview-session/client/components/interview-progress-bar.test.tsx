// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { InterviewProgressBar } from "./interview-progress-bar";

afterEach(cleanup);

describe("InterviewProgressBar", () => {
  it("推定残り問数を範囲で表示する", () => {
    render(
      <InterviewProgressBar
        currentTopic="お願いしたいこと"
        percentage={0}
        remainingQuestionRange={{ min: 12, max: 16 }}
      />
    );

    expect(screen.getByText("あと約12〜16問")).toBeInTheDocument();
  });

  it("最小と最大が同じ場合は1つの数で表示する", () => {
    render(
      <InterviewProgressBar
        currentTopic={null}
        percentage={64}
        remainingQuestionRange={{ min: 3, max: 3 }}
      />
    );

    expect(screen.getByText("あと約3問")).toBeInTheDocument();
  });

  it("要約フェーズ以降は質問終了と表示する", () => {
    render(
      <InterviewProgressBar
        currentTopic="請願事項"
        percentage={90}
        remainingQuestionRange={null}
      />
    );

    expect(screen.getByText("質問終了")).toBeInTheDocument();
  });

  it("残り時間は表示しない", () => {
    render(
      <InterviewProgressBar
        currentTopic={null}
        percentage={0}
        remainingQuestionRange={{ min: 12, max: 16 }}
      />
    );

    expect(screen.queryByText(/残り約.*分/)).not.toBeInTheDocument();
  });
});
