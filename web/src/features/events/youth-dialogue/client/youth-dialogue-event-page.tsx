"use client";

import { ArrowRight, CalendarDays, MapPin, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { usePublicCommentAttribution } from "@/features/public-comment/shared/client/use-public-comment-attribution";
import { routes } from "@/lib/routes";

export function YouthDialogueEventPage() {
  const { ensureAttribution } = usePublicCommentAttribution({
    journeyType: "event_direct",
    adTheme: "event-direct",
  });
  const [publicToken, setPublicToken] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void ensureAttribution().then((token) => {
      if (active) setPublicToken(token);
    });
    return () => {
      active = false;
    };
  }, [ensureAttribution]);

  const applyHref = routes.youthDialogueEventApply(publicToken);

  return (
    <div className="bg-mirai-surface pb-24 text-mirai-text">
      <section className="border-b border-mirai-border bg-mirai-gradient px-4 py-14 md:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-bold tracking-[0.15em] text-primary">
            みらい議会＠世田谷区
          </p>
          <h1 className="mt-5 text-3xl font-bold leading-relaxed md:text-5xl">
            AIに話したその続きを、
            <br className="hidden sm:block" />
            今度は人と話してみませんか。
          </h1>
          <p className="mt-5 text-xl font-bold text-primary">
            若者と地域を語る会
          </p>
          <p className="mx-auto mt-5 max-w-2xl leading-8 text-mirai-text-secondary">
            若い世代が主催する、世代や立場を超えた対話の場です。
            専門知識やまとまった意見は必要ありません。話を聞くことを中心にした参加も歓迎します。
          </p>
          <div className="mx-auto mt-8 grid max-w-2xl gap-3 text-left sm:grid-cols-3">
            <EventFact icon={<CalendarDays className="size-5" />}>
              2026年10月3日（土）
              <br />
              14:00〜16:00
            </EventFact>
            <EventFact icon={<MapPin className="size-5" />}>
              太子堂区民センター
              <br />
              第二会議室
            </EventFact>
            <EventFact icon={<Users className="size-5" />}>
              どの世代も歓迎
              <br />
              参加費無料
            </EventFact>
          </div>
          <Button asChild className="mt-9 min-h-12 rounded-full px-8 text-base">
            <a href={applyHref} target="_blank" rel="noreferrer">
              参加を申し込む
              <ArrowRight className="size-4" />
            </a>
          </Button>
        </div>
      </section>

      <section className="mx-auto grid max-w-4xl gap-5 px-4 py-12 md:grid-cols-3">
        <DialogueStep title="気になっていることを話す">
          AIインタビューで考えたことや、普段の暮らしで感じていることを少人数で話します。
        </DialogueStep>
        <DialogueStep title="違う経験に耳を傾ける">
          同じ地域で暮らす人が、何に困り、何を大切にしているのかを聞き合います。
        </DialogueStep>
        <DialogueStep title="問いを持ち帰る">
          話して気づいたことや、新しく生まれた問いを振り返ります。
        </DialogueStep>
      </section>

      <section id="registration" className="scroll-mt-8 px-4">
        <div className="mx-auto max-w-2xl rounded-3xl border border-mirai-border bg-white p-6 shadow-sm md:p-10">
          <h2 className="text-2xl font-bold">参加申込</h2>
          <p className="mt-3 text-sm leading-7 text-mirai-text-secondary">
            申込はGoogleフォームで受け付けます。フォームの回答はGoogleフォーム側で管理され、本サイトの管理画面には保存されません。また、回答者とAIインタビュー完了者を個人単位で結び付けません。取得する情報はフォーム内の説明をご確認ください。
          </p>
          <Button
            asChild
            className="mt-7 min-h-12 w-full rounded-full text-base"
          >
            <a href={applyHref} target="_blank" rel="noreferrer">
              Googleフォームで参加を申し込む
              <ArrowRight className="size-4" />
            </a>
          </Button>
          <p className="mt-5 text-xs leading-6 text-mirai-text-muted">
            送信前に
            <Link href={routes.privacy()} className="mx-1 underline">
              プライバシーポリシー
            </Link>
            をご確認ください。
          </p>
        </div>
      </section>
    </div>
  );
}

function EventFact({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 rounded-2xl border border-mirai-border bg-white p-4 text-sm font-medium leading-6">
      <span className="mt-0.5 text-primary">{icon}</span>
      <span>{children}</span>
    </div>
  );
}

function DialogueStep({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <article className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="font-bold text-primary">{title}</h2>
      <p className="mt-3 text-sm leading-7 text-mirai-text-secondary">
        {children}
      </p>
    </article>
  );
}
