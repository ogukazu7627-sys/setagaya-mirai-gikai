import type { Metadata } from "next";
import { YouthDialogueEvent } from "@/features/events/youth-dialogue/server/components/youth-dialogue-event";

// 締切・開催後に申込ボタンを消すため、受付状態を定期的に再計算する
export const revalidate = 300;

export const metadata: Metadata = {
  title: "世田谷のみらいを語る会 | みらい議会＠世田谷区",
  description:
    "世田谷の気になることを、世代や立場をこえて話す対話の会です。2026年10月3日（土）14:00〜16:00、太子堂区民センターで開催。参加費無料、AIインタビューを使っていなくても参加できます。主催：civictech-setagaya。",
};

export default function Page() {
  return <YouthDialogueEvent />;
}
