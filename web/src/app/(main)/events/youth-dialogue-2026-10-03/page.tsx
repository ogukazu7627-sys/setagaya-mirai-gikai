import type { Metadata } from "next";
import { YouthDialogueEventPage } from "@/features/events/youth-dialogue/client/youth-dialogue-event-page";

export const metadata: Metadata = {
  title: "若者と地域を語る会 | みらい議会＠世田谷区",
  description:
    "AIインタビューをきっかけに、世代や立場を超えて地域のことを話す対話会です。2026年10月3日、太子堂区民センターで開催します。",
};

export default function Page() {
  return <YouthDialogueEventPage />;
}
