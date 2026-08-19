"use client";

import { type RefObject, useEffect } from "react";

/**
 * 自前実装のモーダルを Escape で閉じられるようにする。
 * コンテナの onKeyDown だけではフォーカスがモーダル内に無いと発火しないため、
 * document で受けたうえで開いた瞬間にコンテナへフォーカスを移す。
 */
export function useEscapeToClose(
  isOpen: boolean,
  onClose: () => void,
  containerRef?: RefObject<HTMLElement | null>
): void {
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    containerRef?.current?.focus();
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [containerRef, isOpen, onClose]);
}
