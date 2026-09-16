// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import fs from "node:fs";
import path from "node:path";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Footer } from "@/components/layouts/footer/footer";
import { MainLayout } from "@/components/layouts/main-layout";
import { MobileBottomNavigation } from "@/features/primary-navigation/client/components/mobile-bottom-navigation";

vi.mock("next/navigation", () => ({
  usePathname: () => "/public-comment/minpaku",
}));

vi.mock(
  "@/features/primary-navigation/client/hooks/use-mobile-navigation-keyboard",
  () => ({
    useMobileNavigationKeyboard: () => false,
  })
);

function Page({ interview }: { interview: boolean }) {
  return (
    <>
      <MainLayout>
        <main>
          {interview ? (
            <div data-public-comment-interview>インタビュー</div>
          ) : (
            <h1>学習・下書き確認・完了</h1>
          )}
        </main>
        <Footer />
      </MainLayout>
      <MobileBottomNavigation />
    </>
  );
}

describe("民泊インタビュー中の下部表示", () => {
  let style: HTMLStyleElement;
  beforeEach(() => {
    style = document.createElement("style");
    style.textContent = fs.readFileSync(
      path.join(__dirname, "public-comment-interview-layout.css"),
      "utf8"
    );
    document.head.append(style);
  });
  afterEach(() => {
    cleanup();
    style.remove();
  });

  it("インタビュー中だけフッターと下部ナビを隠し、画面を離れると戻す", () => {
    const { rerender } = render(<Page interview={false} />);
    const footer = screen.getByRole("contentinfo");
    const navigation = screen.getByRole("navigation", {
      name: "主要ナビゲーション",
    }).parentElement!;
    expect(footer).toBeVisible();
    expect(navigation).toBeVisible();

    rerender(<Page interview />);
    expect(footer).not.toBeVisible();
    expect(navigation).not.toBeVisible();
    expect(getComputedStyle(screen.getByRole("main"))).toHaveProperty(
      "minHeight",
      "0px"
    );
    expect(getComputedStyle(footer.parentElement!)).toHaveProperty(
      "paddingBottom",
      "0px"
    );

    rerender(<Page interview={false} />);
    expect(footer).toBeVisible();
    expect(navigation).toBeVisible();
    expect(getComputedStyle(screen.getByRole("main")).minHeight).not.toBe(
      "0px"
    );
    expect(getComputedStyle(footer.parentElement!).paddingBottom).not.toBe(
      "0px"
    );
  });

  it("アンマウント後は通常ページのフッターを隠さない", () => {
    const { unmount } = render(<Page interview />);
    unmount();
    render(<Page interview={false} />);
    expect(screen.getByRole("contentinfo")).toBeVisible();
    expect(
      screen.getByRole("navigation", {
        name: "主要ナビゲーション",
      })
    ).toBeVisible();
  });
});
