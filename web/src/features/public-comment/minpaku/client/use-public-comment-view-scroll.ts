"use client";

import { type RefObject, useEffect } from "react";

export function usePublicCommentViewScroll(
  view: string,
  containerRef: RefObject<HTMLElement | null>
) {
  useEffect(() => {
    // Learning manages focus and scrolling for each chapter itself.
    if (view === "learning") return;

    const heading = containerRef.current?.querySelector("h1");
    if (heading) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [view, containerRef]);
}
