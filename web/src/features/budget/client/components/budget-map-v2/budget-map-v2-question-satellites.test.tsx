// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { BudgetMapQuestion } from "../../../shared/utils/budget-map-question-orbit";
import { BudgetMapV2QuestionSatellites } from "./budget-map-v2-question-satellites";

const questions: BudgetMapQuestion[] = [
  {
    questionId: "question-1",
    text: "学校施設の改築計画について",
    member: "世田谷太郎",
    photo: "/icons/councilors/setagaya-taro.jpg",
  },
  {
    questionId: "question-2",
    text: "給食費の負担軽減について",
    member: "世田谷花子",
    photo: "/icons/councilors/setagaya-hanako.jpg",
  },
  {
    questionId: "question-3",
    text: "防災備蓄の充実について",
    member: "世田谷次郎",
    photo: "/icons/councilors/setagaya-jiro.jpg",
  },
];

function renderSatellites(
  overrides: Partial<
    React.ComponentProps<typeof BudgetMapV2QuestionSatellites>
  > = {}
) {
  const onSelect = vi.fn();
  const onOpenChange = vi.fn();
  const result = render(
    <BudgetMapV2QuestionSatellites
      center={{ x: 500, y: 325 }}
      disabled={false}
      mode="desktop"
      onOpenChange={onOpenChange}
      onSelect={onSelect}
      openQuestionId={null}
      questions={questions}
      seed={13}
      {...overrides}
    />
  );
  return { ...result, onSelect, onOpenChange };
}

describe("BudgetMapV2QuestionSatellites", () => {
  it("質問が0件なら衛星を出さない", () => {
    const { container } = renderSatellites({ questions: [] });

    expect(
      container.querySelectorAll(".budget-map-v2-question-orbit")
    ).toHaveLength(0);
  });

  it("議員名と質問を読み上げられるボタンとして出す", () => {
    renderSatellites();

    expect(
      screen.getByRole("button", {
        name: "世田谷太郎議員の質問、学校施設の改築計画について、質問の詳細を見る",
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "世田谷花子議員の質問、給食費の負担軽減について、質問の詳細を見る",
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "世田谷次郎議員の質問、防災備蓄の充実について、質問の詳細を見る",
      })
    ).toBeInTheDocument();
  });

  it("議員名は「議員」を添えて中央に置く", () => {
    const { container } = renderSatellites();
    const member = container.querySelector<HTMLElement>(
      ".budget-map-v2-question-member"
    );

    expect(member?.textContent).toBe("世田谷太郎議員");
  });

  it("顔写真を background-image で指定する", () => {
    const { container } = renderSatellites();
    const hit = container.querySelector<HTMLElement>(
      ".budget-map-v2-question-hit"
    );

    expect(hit?.style.getPropertyValue("--budget-q-photo")).toBe(
      'url("/icons/councilors/setagaya-taro.jpg")'
    );
    // img の src は使わない。ストリーミング中に未解決の値でフェッチが走るため。
    expect(container.querySelectorAll("img")).toHaveLength(0);
  });

  it("バッジは顔の外へはみ出す位置に置き、切り取らない", () => {
    const { container } = renderSatellites();
    const hit = container.querySelector<HTMLElement>(
      ".budget-map-v2-question-hit"
    );
    const chip = container.querySelector<HTMLElement>(
      ".budget-map-v2-question-chip"
    );

    // 顔半径17 + バッジ半径7.5 の外接位置。水平から下20度なので
    // 横へ大きく（right -14px）、縦はわずかに戻る（bottom 1px）。
    expect(hit?.style.getPropertyValue("--budget-q-mark-right")).toBe("-14px");
    expect(hit?.style.getPropertyValue("--budget-q-mark-bottom")).toBe("1px");
    // チップに overflow を掛けるとバッジが切れる
    expect(chip?.style.overflow).toBe("");
  });

  it("開いた状態を transition の開始値に依存させない", () => {
    const { container, rerender } = renderSatellites();
    const closedHit = container.querySelector<HTMLElement>(
      ".budget-map-v2-question-hit"
    );

    // 閉じているときは開いた分の指定を持たない
    expect(closedHit?.style.getPropertyValue("--budget-q-open-body-max")).toBe(
      ""
    );

    rerender(
      <BudgetMapV2QuestionSatellites
        center={{ x: 500, y: 325 }}
        disabled={false}
        mode="desktop"
        onOpenChange={vi.fn()}
        onSelect={vi.fn()}
        openQuestionId="question-1"
        questions={questions}
        seed={13}
      />
    );
    const openHit = container.querySelector<HTMLElement>(
      ".budget-map-v2-question-hit"
    );

    // 開いた時点で最終値を直接与える。transition が進まない環境でも
    // 質問文が出ないままにならないこと。
    expect(openHit?.style.getPropertyValue("--budget-q-open-body-max")).toBe(
      "300px"
    );
    expect(
      openHit?.style.getPropertyValue("--budget-q-open-body-opacity")
    ).toBe("1");
    expect(openHit?.style.getPropertyValue("--budget-q-open-gap")).toBe("9px");
  });

  it("通常時から課題・事業ノードより手前に置く", () => {
    const { container, rerender } = renderSatellites();
    const orbit = container.querySelector<HTMLElement>(
      ".budget-map-v2-question-orbit"
    );

    expect(orbit).toHaveAttribute("data-open", "false");
    expect(orbit?.style.getPropertyValue("--budget-q-layer")).toBe("25");

    rerender(
      <BudgetMapV2QuestionSatellites
        center={{ x: 500, y: 325 }}
        disabled={false}
        mode="desktop"
        onOpenChange={vi.fn()}
        onSelect={vi.fn()}
        openQuestionId="question-1"
        questions={questions}
        seed={13}
      />
    );

    const openOrbit = container.querySelector<HTMLElement>(
      ".budget-map-v2-question-orbit"
    );
    expect(openOrbit).toHaveAttribute("data-open", "true");
    expect(openOrbit?.style.getPropertyValue("--budget-q-layer")).toBe("30");
  });

  it("マウスは hover で開き、クリックで遷移する", async () => {
    const user = userEvent.setup();
    const { onOpenChange, onSelect } = renderSatellites();
    const button = screen.getByRole("button", {
      name: /世田谷太郎議員の質問/,
    });

    await user.hover(button);
    expect(onOpenChange).toHaveBeenCalledWith("question-1");

    await user.click(button);
    expect(onSelect).toHaveBeenCalledWith(questions[0]);
  });

  it("タッチは1回目で開き、2回目で遷移する", async () => {
    const user = userEvent.setup();
    const { onOpenChange, onSelect, rerender } = renderSatellites();
    const button = screen.getByRole("button", {
      name: /世田谷太郎議員の質問/,
    });

    await user.pointer({ keys: "[TouchA]", target: button });
    expect(onOpenChange).toHaveBeenCalledWith("question-1");
    expect(onSelect).not.toHaveBeenCalled();

    const onSelectOpen = vi.fn();
    rerender(
      <BudgetMapV2QuestionSatellites
        center={{ x: 500, y: 325 }}
        disabled={false}
        mode="desktop"
        onOpenChange={vi.fn()}
        onSelect={onSelectOpen}
        openQuestionId="question-1"
        questions={questions}
        seed={13}
      />
    );
    await user.pointer({
      keys: "[TouchA]",
      target: screen.getByRole("button", { name: /世田谷太郎議員の質問/ }),
    });

    expect(onSelectOpen).toHaveBeenCalledWith(questions[0]);
  });

  it("遷移中は押しても反応しない", async () => {
    const user = userEvent.setup();
    const { onSelect } = renderSatellites({ disabled: true });
    const button = screen.getByRole("button", {
      name: /世田谷太郎議員の質問/,
    });

    await user.click(button);

    expect(onSelect).not.toHaveBeenCalled();
  });

  it("軌道の入れ子を4段で作り、1要素に複数のtransformを重ねない", () => {
    const { container } = renderSatellites();
    const orbit = container.querySelector(".budget-map-v2-question-orbit");

    expect(
      orbit?.querySelector(
        ".budget-map-v2-question-ax > .budget-map-v2-question-ay > .budget-map-v2-question-bob"
      )
    ).not.toBeNull();
  });
});
