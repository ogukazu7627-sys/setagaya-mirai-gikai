// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DelayedQuickReplies } from "./delayed-quick-replies";

describe("DelayedQuickReplies", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  const advance = (time: number) => act(() => vi.advanceTimersByTime(time));
  const replies = ["近隣で暮らしている"];

  it("無入力のまま5秒経過したときだけ選択肢を操作できる", () => {
    const onSelect = vi.fn();
    render(
      <DelayedQuickReplies
        replies={replies}
        disabled={false}
        onSelect={onSelect}
      />
    );
    advance(4_999);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    advance(1);
    fireEvent.click(screen.getByRole("button", { name: replies[0] }));
    expect(onSelect).toHaveBeenCalledExactlyOnceWith(replies[0]);
  });

  it("同じ質問の再レンダーでは待ち時間を延ばさない", () => {
    const { rerender } = render(
      <DelayedQuickReplies
        replies={replies}
        disabled={false}
        onSelect={vi.fn()}
      />
    );
    advance(3_000);
    rerender(
      <DelayedQuickReplies
        replies={[...replies]}
        disabled={false}
        onSelect={vi.fn()}
      />
    );
    advance(2_000);
    expect(
      screen.getByRole("button", { name: replies[0] })
    ).toBeInTheDocument();
  });

  it("選択肢が空の間は待たず、選択肢が届いてから5秒待つ", () => {
    const { rerender } = render(
      <DelayedQuickReplies replies={[]} disabled={false} onSelect={vi.fn()} />
    );
    advance(10_000);
    expect(vi.getTimerCount()).toBe(0);
    rerender(
      <DelayedQuickReplies
        replies={replies}
        disabled={false}
        onSelect={vi.fn()}
      />
    );
    advance(4_999);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    advance(1);
    expect(
      screen.getByRole("button", { name: replies[0] })
    ).toBeInTheDocument();
  });

  it("待機中に無効化したらタイマーを破棄し、再開時も5秒待つ", () => {
    const { rerender } = render(
      <DelayedQuickReplies
        replies={replies}
        disabled={false}
        onSelect={vi.fn()}
      />
    );
    advance(4_000);
    rerender(
      <DelayedQuickReplies replies={replies} disabled onSelect={vi.fn()} />
    );
    expect(vi.getTimerCount()).toBe(0);
    advance(10_000);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    rerender(
      <DelayedQuickReplies
        replies={replies}
        disabled={false}
        onSelect={vi.fn()}
      />
    );
    advance(4_999);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    advance(1);
    expect(
      screen.getByRole("button", { name: replies[0] })
    ).toBeInTheDocument();
  });
});
