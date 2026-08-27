"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import { PRIMARY_NAVIGATION_ITEMS } from "@/features/primary-navigation/shared/primary-navigation";
import {
  buildPublicViewUrl,
  isRestorablePublicPath,
  readComponentState,
  readScrollPosition,
  writeComponentState,
  writePrimaryDestination,
  writeScrollPosition,
} from "../utils/public-view-state-storage";

const SCROLL_SAVE_DELAY_MS = 150;
const MAX_RESTORE_FRAMES = 90;

type StoredDetailsState = {
  openIndexes: number[];
};

function isStoredDetailsState(value: unknown): value is StoredDetailsState {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const openIndexes = (value as Partial<StoredDetailsState>).openIndexes;
  return (
    Array.isArray(openIndexes) &&
    openIndexes.every((index) => Number.isInteger(index) && index >= 0)
  );
}

export function PublicViewStateTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pageUrl = useMemo(
    () => buildPublicViewUrl(pathname, searchParams.toString()),
    [pathname, searchParams]
  );

  useEffect(() => {
    if (!isRestorablePublicPath(pathname)) {
      return;
    }

    const primaryItem = PRIMARY_NAVIGATION_ITEMS.find(
      (item) => item.href === pathname
    );
    if (primaryItem) {
      writePrimaryDestination(primaryItem.id, primaryItem.href, pageUrl);
    }

    const savedScrollY = readScrollPosition(pageUrl);
    const detailsStateKey = `details:${pageUrl}`;
    const savedDetailsState = readComponentState(
      detailsStateKey,
      isStoredDetailsState
    );
    const detailsElements = Array.from(
      document.querySelectorAll<HTMLDetailsElement>("details")
    );
    if (savedDetailsState) {
      const openIndexes = new Set(savedDetailsState.openIndexes);
      detailsElements.forEach((details, index) => {
        details.open = openIndexes.has(index);
      });
    }

    let latestScrollY = savedScrollY ?? window.scrollY;
    let restoreFrameId: number | null = null;
    let saveTimerId: number | null = null;
    let isRestoring = savedScrollY !== null && window.location.hash === "";
    let restoreAttempt = 0;

    const saveNow = () => {
      if (isRestoring) {
        return;
      }
      if (saveTimerId !== null) {
        window.clearTimeout(saveTimerId);
        saveTimerId = null;
      }
      writeScrollPosition(pageUrl, latestScrollY);
    };

    const handleScroll = () => {
      if (isRestoring) {
        return;
      }
      latestScrollY = window.scrollY;
      if (saveTimerId !== null) {
        window.clearTimeout(saveTimerId);
      }
      saveTimerId = window.setTimeout(saveNow, SCROLL_SAVE_DELAY_MS);
    };

    const cancelRestoreForUserInteraction = () => {
      if (!isRestoring) {
        return;
      }

      isRestoring = false;
      latestScrollY = window.scrollY;
      if (restoreFrameId !== null) {
        window.cancelAnimationFrame(restoreFrameId);
        restoreFrameId = null;
      }
    };

    const handleInternalLinkClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) {
        return;
      }
      const target = event.target;
      const anchor =
        target instanceof Element
          ? target.closest<HTMLAnchorElement>("a")
          : null;
      if (!anchor) {
        return;
      }

      try {
        const destination = new URL(anchor.href, window.location.href);
        if (destination.origin === window.location.origin) {
          latestScrollY = window.scrollY;
          saveNow();
        }
      } catch {
        // 不正なhrefでも現在ページの閲覧を妨げない。
      }
    };

    const saveDetailsState = () => {
      const openIndexes = detailsElements.flatMap((details, index) =>
        details.open ? [index] : []
      );
      writeComponentState(detailsStateKey, { openIndexes });
    };

    const handleDetailsToggle = (event: Event) => {
      if (event.target instanceof HTMLDetailsElement) {
        saveDetailsState();
      }
    };

    const restore = () => {
      if (!(isRestoring && savedScrollY !== null)) {
        return;
      }

      restoreAttempt += 1;
      const maxScrollY = Math.max(
        0,
        document.documentElement.scrollHeight - window.innerHeight
      );
      const canReachSavedPosition = maxScrollY >= savedScrollY;
      if (canReachSavedPosition || restoreAttempt >= MAX_RESTORE_FRAMES) {
        const restoredScrollY = Math.min(savedScrollY, maxScrollY);
        window.scrollTo({ top: restoredScrollY, left: 0, behavior: "auto" });
        latestScrollY = restoredScrollY;
        isRestoring = false;
        return;
      }

      restoreFrameId = window.requestAnimationFrame(restore);
    };

    if (isRestoring) {
      restoreFrameId = window.requestAnimationFrame(restore);
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("pagehide", saveNow);
    window.addEventListener("pointerdown", cancelRestoreForUserInteraction, {
      passive: true,
    });
    window.addEventListener("touchstart", cancelRestoreForUserInteraction, {
      passive: true,
    });
    window.addEventListener("wheel", cancelRestoreForUserInteraction, {
      passive: true,
    });
    window.addEventListener("keydown", cancelRestoreForUserInteraction);
    document.addEventListener("click", handleInternalLinkClick, true);
    document.addEventListener("toggle", handleDetailsToggle, true);

    return () => {
      if (restoreFrameId !== null) {
        window.cancelAnimationFrame(restoreFrameId);
      }
      if (saveTimerId !== null) {
        window.clearTimeout(saveTimerId);
      }
      if (!isRestoring) {
        writeScrollPosition(pageUrl, latestScrollY);
      }
      saveDetailsState();
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("pagehide", saveNow);
      window.removeEventListener(
        "pointerdown",
        cancelRestoreForUserInteraction
      );
      window.removeEventListener("touchstart", cancelRestoreForUserInteraction);
      window.removeEventListener("wheel", cancelRestoreForUserInteraction);
      window.removeEventListener("keydown", cancelRestoreForUserInteraction);
      document.removeEventListener("click", handleInternalLinkClick, true);
      document.removeEventListener("toggle", handleDetailsToggle, true);
    };
  }, [pageUrl, pathname]);

  return null;
}
