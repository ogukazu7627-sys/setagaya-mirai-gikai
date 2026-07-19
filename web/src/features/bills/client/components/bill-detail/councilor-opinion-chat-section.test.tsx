// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CouncilorOpinionChatSection as CouncilorOpinionChatSectionData } from "@/lib/markdown/extract-councilor-opinion-chat-section";
import {
  CouncilorOpinionChatSection,
  shouldHandleCouncilorCarouselDrag,
} from "./councilor-opinion-chat-section";

const baseSection: CouncilorOpinionChatSectionData = {
  title: "議員、会派の意見",
  startOffset: 0,
  endOffset: 0,
  groups: [
    {
      groupIndex: 0,
      rawHeading: "中里光夫議員",
      councilorName: "中里光夫",
      partyOrGroup: null,
      iconUrl: "/icons/councilors/nakazato-mitsuo.jpg",
      messages: [
        {
          messageIndex: 0,
          rawSpeaker: "中里光夫議員",
          speakerName: "中里光夫",
          partyOrGroup: null,
          bodyText: "質問本文です。",
          side: "questioner",
        },
        {
          messageIndex: 1,
          rawSpeaker: "市民活動推進課長・伊藤",
          speakerName: "市民活動推進課長・伊藤",
          partyOrGroup: null,
          bodyText: "答弁本文です。",
          side: "answerer",
        },
        {
          messageIndex: 2,
          rawSpeaker: "中里光夫議員",
          speakerName: "中里光夫",
          partyOrGroup: null,
          bodyText: "2つめの質問本文です。",
          side: "questioner",
        },
      ],
    },
  ],
};

describe("CouncilorOpinionChatSection", () => {
  beforeEach(() => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
    window.IntersectionObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }));
    window.ResizeObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }));
  });

  it("renders one councilor group as continuous messages without carousel controls", () => {
    const { container } = render(
      <CouncilorOpinionChatSection section={baseSection} />
    );

    expect(
      screen.getByRole("heading", { name: "議員、会派の意見" })
    ).toBeInTheDocument();
    expect(screen.getAllByText("中里光夫議員").length).toBeGreaterThan(0);
    expect(screen.getByText("質問本文です。")).toBeInTheDocument();
    expect(screen.getByText("答弁本文です。")).toBeInTheDocument();
    expect(screen.getByText("2つめの質問本文です。")).toBeInTheDocument();
    expect(screen.queryByText("成果指標の数字")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "次の議員・会派を見る" })
    ).not.toBeInTheDocument();
    expect(
      container.querySelector("[data-councilor-chat-scroll-region]")
    ).not.toBeInTheDocument();
  });

  it("renders carousel controls for multiple councilor groups", () => {
    const { container } = render(
      <CouncilorOpinionChatSection
        section={{
          ...baseSection,
          groups: [
            baseSection.groups[0],
            {
              ...baseSection.groups[0],
              groupIndex: 1,
              rawHeading: "田中優子議員",
              councilorName: "田中優子",
              iconUrl: "/icons/councilors/tanaka-yuko.png",
              messages: [
                {
                  messageIndex: 0,
                  rawSpeaker: "田中優子・委員",
                  speakerName: "田中優子・委員",
                  partyOrGroup: null,
                  bodyText: "別の質問本文です。",
                  side: "questioner",
                },
              ],
            },
          ],
        }}
      />
    );

    expect(screen.getByText("1 / 2")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "前の議員・会派を見る" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "次の議員・会派を見る" })
    ).toBeInTheDocument();
    expect(screen.getByText("別の質問本文です。")).toBeInTheDocument();

    const scrollRegions = container.querySelectorAll(
      "[data-councilor-chat-scroll-region='true']"
    );
    expect(scrollRegions).toHaveLength(2);
    expect(scrollRegions[0]).toHaveClass(
      "h-[560px]",
      "max-h-[72vh]",
      "overflow-y-auto"
    );
  });

  it("does not start carousel drag from inside chat bubbles", () => {
    const bubble = document.createElement("div");
    bubble.setAttribute("data-councilor-chat-bubble", "true");
    const bubbleText = document.createElement("span");
    bubble.appendChild(bubbleText);
    const outside = document.createElement("div");

    expect(
      shouldHandleCouncilorCarouselDrag(
        {} as never,
        { target: bubbleText } as unknown as MouseEvent
      )
    ).toBe(false);
    expect(
      shouldHandleCouncilorCarouselDrag(
        {} as never,
        { target: outside } as unknown as MouseEvent
      )
    ).toBe(true);
  });
});
