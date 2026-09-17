import { describe, expect, it } from "vitest";
import { SUICIDE_PREVENTION_LESSONS } from "./learning";

describe("自殺対策計画素案の学習コンテンツ", () => {
  it("指定された6章と確認クイズを順番どおり持つ", () => {
    expect(SUICIDE_PREVENTION_LESSONS).toHaveLength(6);
    expect(SUICIDE_PREVENTION_LESSONS.map((lesson) => lesson.id)).toEqual([
      "plan-purpose",
      "priority-groups",
      "access-points",
      "gatekeeper",
      "continuity",
      "evaluation",
    ]);
    expect(
      SUICIDE_PREVENTION_LESSONS.map((lesson) => lesson.quiz.correctIndex)
    ).toEqual([1, 2, 0, 1, 2, 0]);
  });

  it("検討中の取組と決定済みの取組を区別する", () => {
    const snsLesson = SUICIDE_PREVENTION_LESSONS[2];
    expect(snsLesson.sections[1].body).toContain("導入を検討");
    expect(snsLesson.sections[1].body).toContain("確定したわけではありません");
    expect(snsLesson.quiz.options[2]).toContain("24時間対応サービス");
  });

  it("練馬区の例を世田谷区の決定事項として扱わない", () => {
    const continuityLesson = SUICIDE_PREVENTION_LESSONS[4];
    expect(continuityLesson.sections[1].body).toContain("比較例");
    expect(continuityLesson.sections[1].body).toContain(
      "世田谷区で同じ手順が決まったという意味ではなく"
    );
  });
});
