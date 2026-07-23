// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { createEvent, fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { InterviewChatInput } from "./interview-chat-input";

vi.mock("@/hooks/use-is-desktop", () => ({
  useIsDesktop: () => false,
}));

afterEach(() => {
  vi.useRealTimers();
});

function renderInput(
  overrides: Partial<ComponentProps<typeof InterviewChatInput>> = {}
) {
  const props: ComponentProps<typeof InterviewChatInput> = {
    input: "回答内容",
    isResponding: false,
    onInputChange: vi.fn(),
    onSubmit: vi.fn(),
    placeholder: "AIの質問に回答する",
    ...overrides,
  };

  return {
    ...render(<InterviewChatInput {...props} />),
    props,
  };
}

describe("InterviewChatInput", () => {
  it("IME変換中のform submitを無視する", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-23T00:00:00.000Z"));
    const { props } = renderInput();
    const textbox = screen.getByRole("textbox");
    const form = textbox.closest("form");
    expect(form).not.toBeNull();
    if (!form) {
      return;
    }
    Object.defineProperty(form, "message", {
      configurable: true,
      value: textbox,
    });

    fireEvent.compositionStart(textbox);
    fireEvent.submit(form);
    expect(props.onSubmit).not.toHaveBeenCalled();

    fireEvent.compositionEnd(textbox);
    fireEvent.submit(form);
    expect(props.onSubmit).not.toHaveBeenCalled();

    vi.advanceTimersByTime(101);
    fireEvent.submit(form);
    expect(props.onSubmit).toHaveBeenCalledTimes(1);
  });

  it("回答生成中もフォーカス維持モードではtextareaを残して注意書きを隠す", () => {
    renderInput({
      isResponding: true,
      preserveFocusWhileResponding: true,
      showHint: false,
    });

    const textbox = screen.getByRole("textbox");
    expect(textbox).not.toBeDisabled();
    expect(textbox).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("button", { name: "送信" })).toBeDisabled();
    expect(
      screen.queryByText("個人情報や機密情報は記入しないでください")
    ).not.toBeInTheDocument();
  });

  it("送信ボタンのpointer downでtextareaのblurを防ぐ", () => {
    const onSubmitPointerDownCapture = vi.fn();
    renderInput({
      onSubmitPointerDownCapture,
      preserveFocusWhileResponding: true,
    });
    const submitButton = screen.getByRole("button", { name: "送信" });
    const event = createEvent.pointerDown(submitButton);

    fireEvent(submitButton, event);

    expect(event.defaultPrevented).toBe(true);
    expect(onSubmitPointerDownCapture).toHaveBeenCalledTimes(1);
  });
});
