"use client";

import { useEffect, useState } from "react";
import { useVisualViewportFrame } from "@/hooks/use-visual-viewport-frame";
import { PRIMARY_NAVIGATION_DESKTOP_MIN_WIDTH } from "../../shared/primary-navigation";

export function isTextEntryElement(
  target: EventTarget | Element | null
): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const editableContainer = target.closest<HTMLElement>("[contenteditable]");
  const isEditable =
    target.isContentEditable ||
    target.contentEditable === "true" ||
    (editableContainer != null &&
      editableContainer.getAttribute("contenteditable") !== "false");

  if (target instanceof HTMLTextAreaElement || isEditable) {
    return true;
  }

  if (!(target instanceof HTMLInputElement)) {
    return false;
  }

  return ![
    "button",
    "checkbox",
    "color",
    "file",
    "hidden",
    "image",
    "radio",
    "range",
    "reset",
    "submit",
  ].includes(target.type);
}

export function useMobileNavigationKeyboard(): boolean {
  const [hasTextEntryFocus, setHasTextEntryFocus] = useState(false);
  const frame = useVisualViewportFrame();

  useEffect(() => {
    const updateFromActiveElement = () => {
      setHasTextEntryFocus(isTextEntryElement(document.activeElement));
    };
    const handleFocusIn = (event: FocusEvent) => {
      setHasTextEntryFocus(isTextEntryElement(event.target));
    };
    const handleFocusOut = () => {
      window.requestAnimationFrame(updateFromActiveElement);
    };

    updateFromActiveElement();
    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("focusout", handleFocusOut);

    return () => {
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("focusout", handleFocusOut);
    };
  }, []);

  const isMobileViewport =
    frame.width === 0 ||
    frame.width < PRIMARY_NAVIGATION_DESKTOP_MIN_WIDTH ||
    frame.keyboardInset > 0;

  return hasTextEntryFocus && isMobileViewport;
}
