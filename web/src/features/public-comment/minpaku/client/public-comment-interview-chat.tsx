"use client";

import {
  PublicCommentInterviewChat as SharedInterviewChat,
  type PublicCommentInterviewChatProps,
} from "@/features/public-comment/shared/client/public-comment-interview-chat";
import { MINPAKU_QUESTIONS } from "../shared/campaign";

type Props = Omit<
  PublicCommentInterviewChatProps,
  | "questions"
  | "screenReaderTitle"
  | "privacyNotice"
  | "isComplete"
  | "onContinueToDraft"
>;

export function PublicCommentInterviewChat(props: Props) {
  return (
    <SharedInterviewChat
      {...props}
      questions={MINPAKU_QUESTIONS}
      screenReaderTitle="民泊パブリックコメントのAIインタビュー"
      privacyNotice="住所や氏名など、個人が分かる情報は不要です。"
      isComplete={false}
      onContinueToDraft={() => undefined}
    />
  );
}
