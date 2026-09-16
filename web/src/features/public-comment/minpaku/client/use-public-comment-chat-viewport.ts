"use client";

import { type CSSProperties, useEffect } from "react";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useVisualViewportFrame } from "@/hooks/use-visual-viewport-frame";

export function usePublicCommentChatViewport(inputFocused: boolean) {
  const isMobile = useMediaQuery("(max-width: 999px)");
  const frame = useVisualViewportFrame(isMobile);

  useEffect(() => {
    if (!isMobile) return;
    const scrollY = window.scrollY;
    const body = document.body.style;
    const html = document.documentElement.style;
    const previousBody = {
      position: body.position,
      top: body.top,
      width: body.width,
      overflow: body.overflow,
    };
    const previousHtml = {
      overflow: html.overflow,
      overscrollBehavior: html.overscrollBehavior,
    };

    // Keep Safari's focus scrolling inside the chat, not the page/footer.
    body.position = "fixed";
    body.top = `-${scrollY}px`;
    body.width = "100%";
    body.overflow = "hidden";
    html.overflow = "hidden";
    html.overscrollBehavior = "none";
    return () => {
      Object.assign(body, previousBody);
      Object.assign(html, previousHtml);
      window.scrollTo(0, scrollY);
    };
  }, [isMobile]);

  const style: CSSProperties | undefined = isMobile
    ? {
        position: "fixed",
        top: `calc(${frame.offsetTop}px + var(--app-header-layout-offset))`,
        left: frame.offsetLeft,
        width: frame.width || "100%",
        height: `max(0px, calc(${frame.height || window.innerHeight}px - var(--app-header-layout-offset) - ${inputFocused ? "0px" : "var(--mobile-primary-navigation-layout-offset)"}))`,
        zIndex: 40,
      }
    : undefined;

  return {
    isMobile,
    isCompact: isMobile && frame.height > 0 && frame.height < 420,
    style,
  };
}
