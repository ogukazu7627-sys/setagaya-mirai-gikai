"use client";

import { useLayoutEffect, useRef } from "react";
import type {
  BudgetMapCameraFocus,
  BudgetMapCameraTransform,
  BudgetMapWorldDimensions,
} from "../../shared/utils/budget-map-layout";
import { getBudgetMapCameraTransform } from "../../shared/utils/budget-map-layout";

export function useBudgetMapCamera(input: {
  dimensions: BudgetMapWorldDimensions;
  durationMs: number;
  focus: BudgetMapCameraFocus;
  isTransitioning: boolean;
}) {
  const {
    dimensions: { height, width },
    durationMs,
    focus: { x: focusX, y: focusY, zoom: focusZoom },
    isTransitioning,
  } = input;
  const viewportRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const currentTransformRef = useRef<BudgetMapCameraTransform | null>(null);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const world = worldRef.current;
    if (!viewport || !world) {
      return;
    }

    const cancelCameraAnimation = () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      world.style.willChange = "";
      world.dataset.cameraMoving = "false";
    };

    const readViewportSize = () => {
      const rect = viewport.getBoundingClientRect();
      return {
        width: rect.width || viewport.clientWidth || width,
        height: rect.height || viewport.clientHeight || height,
      };
    };

    const measureTarget = (viewportSize = readViewportSize()) => {
      return getBudgetMapCameraTransform({
        viewportWidth: viewportSize.width,
        viewportHeight: viewportSize.height,
        dimensions: { height, width },
        focus: { x: focusX, y: focusY, zoom: focusZoom },
      });
    };

    const applyTransform = (transform: BudgetMapCameraTransform) => {
      world.style.transform = `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale})`;
      currentTransformRef.current = transform;
    };

    let lastViewportSize = readViewportSize();
    const target = measureTarget(lastViewportSize);
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const start = currentTransformRef.current;
    cancelCameraAnimation();

    if (!isTransitioning || reduceMotion || !start) {
      applyTransform(target);
    } else {
      let startedAt: number | null = null;
      world.style.willChange = "transform";
      world.dataset.cameraMoving = "true";

      const tick = (timestamp: number) => {
        startedAt ??= timestamp;
        const progress = Math.min(1, (timestamp - startedAt) / durationMs);
        const eased = 1 - (1 - progress) ** 3;
        applyTransform({
          x: interpolate(start.x, target.x, eased),
          y: interpolate(start.y, target.y, eased),
          scale: interpolate(start.scale, target.scale, eased),
        });

        if (progress < 1) {
          animationFrameRef.current = window.requestAnimationFrame(tick);
          return;
        }
        animationFrameRef.current = null;
        world.style.willChange = "";
        world.dataset.cameraMoving = "false";
      };

      animationFrameRef.current = window.requestAnimationFrame(tick);
    }

    const handleResize = () => {
      const nextViewportSize = readViewportSize();
      if (
        nextViewportSize.width === lastViewportSize.width &&
        nextViewportSize.height === lastViewportSize.height
      ) {
        return;
      }
      lastViewportSize = nextViewportSize;
      cancelCameraAnimation();
      applyTransform(measureTarget(nextViewportSize));
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState !== "hidden") {
        return;
      }
      cancelCameraAnimation();
      applyTransform(measureTarget(lastViewportSize));
    };
    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(handleResize);
    resizeObserver?.observe(viewport);
    window.addEventListener("resize", handleResize);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      cancelCameraAnimation();
    };
  }, [durationMs, focusX, focusY, focusZoom, height, isTransitioning, width]);

  return { viewportRef, worldRef };
}

function interpolate(start: number, end: number, progress: number): number {
  return start + (end - start) * progress;
}
