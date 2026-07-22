import { useEffect, useState } from "react";

export type VisualViewportFrame = {
  width: number;
  height: number;
  offsetTop: number;
  offsetLeft: number;
  keyboardInset: number;
};

function readVisualViewportFrame(): VisualViewportFrame {
  if (typeof window === "undefined") {
    return {
      width: 0,
      height: 0,
      offsetTop: 0,
      offsetLeft: 0,
      keyboardInset: 0,
    };
  }

  const visualViewport = window.visualViewport;
  if (!visualViewport) {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
      offsetTop: 0,
      offsetLeft: 0,
      keyboardInset: 0,
    };
  }

  const visualBottom = visualViewport.offsetTop + visualViewport.height;
  const keyboardInset = Math.max(0, window.innerHeight - visualBottom);

  return {
    width: visualViewport.width,
    height: visualViewport.height,
    offsetTop: visualViewport.offsetTop,
    offsetLeft: visualViewport.offsetLeft,
    keyboardInset,
  };
}

function isSameFrame(a: VisualViewportFrame, b: VisualViewportFrame) {
  return (
    a.width === b.width &&
    a.height === b.height &&
    a.offsetTop === b.offsetTop &&
    a.offsetLeft === b.offsetLeft &&
    a.keyboardInset === b.keyboardInset
  );
}

export function useVisualViewportFrame(enabled = true): VisualViewportFrame {
  const [frame, setFrame] = useState<VisualViewportFrame>(() =>
    readVisualViewportFrame()
  );

  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      return;
    }

    let rafId: number | null = null;

    const scheduleUpdate = () => {
      if (rafId !== null) {
        return;
      }

      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        const nextFrame = readVisualViewportFrame();
        setFrame((currentFrame) =>
          isSameFrame(currentFrame, nextFrame) ? currentFrame : nextFrame
        );
      });
    };

    scheduleUpdate();

    const visualViewport = window.visualViewport;
    visualViewport?.addEventListener("resize", scheduleUpdate);
    visualViewport?.addEventListener("scroll", scheduleUpdate);
    window.addEventListener("resize", scheduleUpdate);
    window.addEventListener("orientationchange", scheduleUpdate);

    return () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
      visualViewport?.removeEventListener("resize", scheduleUpdate);
      visualViewport?.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      window.removeEventListener("orientationchange", scheduleUpdate);
    };
  }, [enabled]);

  return frame;
}
