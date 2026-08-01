"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import type {
  BudgetMapPosition,
  BudgetMapWorldDimensions,
} from "../../shared/utils/budget-map-layout";
import { getBudgetMapCameraTransform } from "../../shared/utils/budget-map-layout";

/**
 * `#world` 1要素だけに translate3d + scale を適用するカメラ。
 *
 * 動きは CSS transition に任せるため requestAnimationFrame は常に0本。
 * React state を毎フレーム更新せず、ref 経由で style を直接書く。
 * will-change は移動中だけ立て、完了・非表示・unmount で必ず外す。
 */
export function useBudgetMapV2Camera(input: {
  dimensions: BudgetMapWorldDimensions;
  focus: BudgetMapPosition;
  zoom: number;
  durationMs: number;
  easing: string;
}) {
  const {
    dimensions: { height, width },
    durationMs,
    easing,
    focus: { x: focusX, y: focusY },
    zoom,
  } = input;
  const viewportRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const settleTimerRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const world = worldRef.current;
    if (!viewport || !world) {
      return;
    }

    const clearSettleTimer = () => {
      if (settleTimerRef.current !== null) {
        window.clearTimeout(settleTimerRef.current);
        settleTimerRef.current = null;
      }
    };

    const releaseWillChange = () => {
      world.style.willChange = "auto";
      world.dataset.cameraMoving = "false";
    };

    const readViewportSize = () => {
      const rect = viewport.getBoundingClientRect();
      return {
        width: rect.width || viewport.clientWidth || width,
        height: rect.height || viewport.clientHeight || height,
      };
    };

    const applyTransform = (transitionMs: number) => {
      const viewportSize = readViewportSize();
      const transform = getBudgetMapCameraTransform({
        viewportWidth: viewportSize.width,
        viewportHeight: viewportSize.height,
        dimensions: { height, width },
        focus: { x: focusX, y: focusY, zoom },
      });
      world.style.transition =
        transitionMs > 0 ? `transform ${transitionMs}ms ${easing}` : "none";
      world.style.transform = `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale})`;
    };

    clearSettleTimer();

    if (durationMs > 0) {
      world.style.willChange = "transform";
      world.dataset.cameraMoving = "true";
      applyTransform(durationMs);
      settleTimerRef.current = window.setTimeout(
        releaseWillChange,
        durationMs + 60
      );
    } else {
      applyTransform(0);
      releaseWillChange();
    }

    // リサイズ中は演出せず、その場で正しい構図へ置き直す。
    const settleImmediately = () => {
      clearSettleTimer();
      applyTransform(0);
      releaseWillChange();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        settleImmediately();
      }
    };
    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(settleImmediately);
    resizeObserver?.observe(viewport);
    window.addEventListener("resize", settleImmediately);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", settleImmediately);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearSettleTimer();
      releaseWillChange();
    };
  }, [durationMs, easing, focusX, focusY, height, width, zoom]);

  useEffect(() => {
    return () => {
      if (settleTimerRef.current !== null) {
        window.clearTimeout(settleTimerRef.current);
        settleTimerRef.current = null;
      }
    };
  }, []);

  return { viewportRef, worldRef };
}
