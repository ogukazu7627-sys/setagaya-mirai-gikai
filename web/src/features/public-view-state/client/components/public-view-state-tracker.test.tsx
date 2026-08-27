// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  readComponentState,
  readScrollPosition,
  writeComponentState,
  writeScrollPosition,
} from "../utils/public-view-state-storage";
import { PublicViewStateTracker } from "./public-view-state-tracker";

const navigation = vi.hoisted(() => ({
  pathname: "/councilors",
  search: "",
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useSearchParams: () => new URLSearchParams(navigation.search),
}));

describe("PublicViewStateTracker", () => {
  let scrollY = 0;

  beforeEach(() => {
    vi.useFakeTimers();
    window.sessionStorage.clear();
    navigation.pathname = "/councilors";
    navigation.search = "";
    scrollY = 0;
    Object.defineProperty(window, "scrollY", {
      configurable: true,
      get: () => scrollY,
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 800,
    });
    Object.defineProperty(document.documentElement, "scrollHeight", {
      configurable: true,
      value: 2400,
    });
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0);
      return 1;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("同じURLへ戻ると保存済みスクロール位置を復元する", () => {
    writeScrollPosition("/councilors", 640);

    render(<PublicViewStateTracker />);

    expect(window.scrollTo).toHaveBeenCalledWith({
      top: 640,
      left: 0,
      behavior: "auto",
    });
  });

  it("スクロール後の位置をURL単位で保存する", () => {
    render(<PublicViewStateTracker />);
    scrollY = 480;

    act(() => {
      window.dispatchEvent(new Event("scroll"));
      vi.advanceTimersByTime(150);
    });

    expect(readScrollPosition("/councilors")).toBe(480);
  });

  it("復元待ち中にユーザーが操作した場合は現在位置を優先する", () => {
    const pendingRestores: FrameRequestCallback[] = [];
    Object.defineProperty(document.documentElement, "scrollHeight", {
      configurable: true,
      value: 800,
    });
    vi.mocked(window.requestAnimationFrame).mockImplementation((callback) => {
      pendingRestores.push(callback);
      return 2;
    });
    writeScrollPosition("/councilors", 640);

    render(<PublicViewStateTracker />);
    window.dispatchEvent(new Event("pointerdown"));
    pendingRestores[0]?.(0);

    expect(window.cancelAnimationFrame).toHaveBeenCalledWith(2);
    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it("同じURLへ戻るとdetailsの開閉状態を復元する", () => {
    writeComponentState("details:/councilors", { openIndexes: [1] });

    render(
      <>
        <PublicViewStateTracker />
        <details>
          <summary>最初の項目</summary>
        </details>
        <details>
          <summary>開いていた項目</summary>
        </details>
      </>
    );

    const details = document.querySelectorAll("details");
    expect(details[0]?.open).toBe(false);
    expect(details[1]?.open).toBe(true);

    if (details[0]) {
      details[0].open = true;
      details[0].dispatchEvent(new Event("toggle"));
    }
    expect(
      readComponentState(
        "details:/councilors",
        (value): value is { openIndexes: number[] } =>
          typeof value === "object" &&
          value !== null &&
          Array.isArray((value as { openIndexes?: unknown }).openIndexes)
      )
    ).toEqual({ openIndexes: [0, 1] });
  });

  it("AIインタビュー画面ではスクロールを復元しない", () => {
    navigation.pathname = "/bills/bill-id/interview/chat";
    writeScrollPosition("/bills/bill-id/interview/chat", 640);

    render(<PublicViewStateTracker />);

    expect(window.scrollTo).not.toHaveBeenCalled();
  });
});
