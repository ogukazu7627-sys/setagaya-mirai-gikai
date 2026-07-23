"use client";

import Image from "next/image";
import type {
  ChangeEvent,
  CompositionEventHandler,
  FocusEventHandler,
  MutableRefObject,
  PointerEventHandler,
  Ref,
} from "react";
import { useCallback, useEffect, useRef } from "react";
import {
  PromptInput,
  PromptInputBody,
  PromptInputError,
  PromptInputHint,
  type PromptInputMessage,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { useIsDesktop } from "@/hooks/use-is-desktop";

const COMPOSITION_SUBMIT_GUARD_MS = 100;

interface InterviewChatInputProps {
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: (message: PromptInputMessage) => void;
  placeholder: string;
  isResponding: boolean;
  error?: Error | null;
  showHint?: boolean;
  textareaRef?: Ref<HTMLTextAreaElement>;
  onTextareaPointerDown?: PointerEventHandler<HTMLTextAreaElement>;
  onTextareaFocus?: FocusEventHandler<HTMLTextAreaElement>;
  onTextareaBlur?: FocusEventHandler<HTMLTextAreaElement>;
  onSubmitPointerDown?: PointerEventHandler<HTMLButtonElement>;
  preserveFocusWhileResponding?: boolean;
}

export function InterviewChatInput({
  input,
  onInputChange,
  onSubmit,
  placeholder,
  isResponding,
  error,
  showHint = true,
  textareaRef: forwardedTextareaRef,
  onTextareaPointerDown,
  onTextareaFocus,
  onTextareaBlur,
  onSubmitPointerDown,
  preserveFocusWhileResponding = false,
}: InterviewChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isComposingRef = useRef(false);
  const compositionEndAtRef = useRef(0);
  const isDesktop = useIsDesktop();

  const setTextareaRef = useCallback(
    (textarea: HTMLTextAreaElement | null) => {
      textareaRef.current = textarea;
      if (typeof forwardedTextareaRef === "function") {
        forwardedTextareaRef(textarea);
      } else if (forwardedTextareaRef) {
        (
          forwardedTextareaRef as MutableRefObject<HTMLTextAreaElement | null>
        ).current = textarea;
      }
    },
    [forwardedTextareaRef]
  );

  useEffect(() => {
    if (!input && textareaRef.current) {
      textareaRef.current.style.height = "";
    }
  }, [input]);

  const handleInputChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    onInputChange(e.target.value);

    // Auto-resize
    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  };

  const handleSubmit = (message: PromptInputMessage) => {
    if (
      isResponding ||
      isComposingRef.current ||
      Date.now() - compositionEndAtRef.current < COMPOSITION_SUBMIT_GUARD_MS
    ) {
      return;
    }
    onSubmit(message);
  };

  const handleCompositionStart: CompositionEventHandler<
    HTMLTextAreaElement
  > = () => {
    isComposingRef.current = true;
  };

  const handleCompositionEnd: CompositionEventHandler<
    HTMLTextAreaElement
  > = () => {
    isComposingRef.current = false;
    compositionEndAtRef.current = Date.now();
  };

  return (
    <>
      <PromptInput
        onSubmit={handleSubmit}
        className="flex items-end gap-2.5 py-1 pl-6 pr-4 bg-white rounded-[50px] border-mirai-gradient divide-y-0"
      >
        <PromptInputBody className="flex-1">
          <PromptInputTextarea
            ref={setTextareaRef}
            onChange={handleInputChange}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            onPointerDown={onTextareaPointerDown}
            onFocus={onTextareaFocus}
            onBlur={onTextareaBlur}
            value={input}
            placeholder={placeholder}
            rows={1}
            submitOnEnter={isDesktop}
            disabled={isResponding && !preserveFocusWhileResponding}
            aria-busy={isResponding}
            className="!min-h-0 min-w-0 wrap-anywhere text-base md:text-sm font-medium leading-[1.5em] tracking-[0.01em] placeholder:text-mirai-text-placeholder placeholder:font-medium placeholder:leading-[1.5em] placeholder:tracking-[0.01em] placeholder:no-underline border-none focus:ring-0 bg-transparent shadow-none !py-2 !px-0 disabled:cursor-not-allowed disabled:opacity-70"
          />
        </PromptInputBody>
        <button
          type="submit"
          disabled={!input || isResponding}
          onPointerDown={(event) => {
            if (preserveFocusWhileResponding) {
              event.preventDefault();
            }
            onSubmitPointerDown?.(event);
          }}
          className="flex-shrink-0 w-10 h-10 disabled:opacity-50"
        >
          <Image
            src="/icons/send-button-icon.svg"
            alt="送信"
            width={40}
            height={40}
            className="w-full h-full"
          />
        </button>
      </PromptInput>
      <PromptInputError status={error ? "error" : undefined} error={error} />
      {showHint && (
        <PromptInputHint>
          個人情報や機密情報は記入しないでください
        </PromptInputHint>
      )}
    </>
  );
}
