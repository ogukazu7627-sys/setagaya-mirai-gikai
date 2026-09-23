"use client";

import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Check,
  ExternalLink,
  MessagesSquare,
  Plus,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { type ReactNode, useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  YOUTH_DIALOGUE_EVENT as EVENT,
  YOUTH_DIALOGUE_PROMISES,
  YOUTH_DIALOGUE_TOPICS,
} from "@/features/events/youth-dialogue/shared/event-details";
import type { RegistrationStatus } from "@/features/events/youth-dialogue/shared/utils/get-registration-status";
import { usePublicCommentAttribution } from "@/features/public-comment/shared/client/use-public-comment-attribution";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

// 構成は「駒場こども縁日」（次世代の学び創造機構）のページと同じ並び・同じ部品。
// 色と書体は、みらい議会＠世田谷のデザインシステムに合わせている。

/** ヒーローの背景写真（会場のある三軒茶屋・太子堂あたりの街並み） */
const HERO_PHOTO = "/images/events/youth-dialogue/hero.webp";

const CLOSED_MESSAGES: Record<Exclude<RegistrationStatus, "open">, string> = {
  closed: "申込の受付は終了しました。",
  full: "定員に達したため、申込の受付を終了しました。",
  ended: "このイベントは終了しました。",
};

const APPLY_NOTE = "申込はGoogleフォームで受け付けます（新しいタブで開きます）";

// ブランド標準のフォーカス色（primary）は淡い面で 3:1 に届かないため、濃い青で示す
const FOCUS_STRONG =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong";

const RECOMMENDS = [
  "暮らしやまちのことで、気になっていることがある",
  "ちがう世代や立場の人が、どう考えているか聴いてみたい",
  "政治や地域のことを、身近な言葉で話してみたい",
] as const;

const AIMS = [
  {
    kanji: "話",
    title: "話す",
    body: "暮らしの中で気になっていること、まちで見聞きして引っかかっていることを、うまくまとまっていなくても、ことばにしてみます。",
  },
  {
    kanji: "聴",
    title: "聴く",
    body: "同じ世田谷で暮らす、年齢や立場のちがう人の経験に耳を傾けます。話すより聴くほうが多くてもかまいません。",
  },
  {
    kanji: "問",
    title: "問いを持ち帰る",
    body: "話して、聴いて、気づいたことや新しく生まれた問いを、それぞれが持ち帰ります。",
  },
] as const;

const BACKGROUND_CARDS = [
  {
    image: "/images/events/youth-dialogue/background-site.webp",
    tag: "サイト",
    title: "みらい議会＠世田谷区",
    body: "世田谷区議会の議案などを、やさしい言葉で紹介する非公式のWebサイト。チームみらいの「みらい議会」を参考にした世田谷区版で、世田谷区やチームみらいが公式に運営するものではありません。",
  },
  {
    image: "/images/events/youth-dialogue/background-ai-interview.webp",
    tag: "機能",
    title: "AIインタビュー",
    body: "政策資料をふまえたAIの質問に答えながら、考えを整理し、意見の下書きをつくる機能。AIは賛成・反対を決めず、下書きはご自身で確認・編集してから提出します。",
  },
  {
    image: "/images/events/youth-dialogue/background-official-documents.webp",
    tag: "ご注意",
    title: "公式資料もご確認ください",
    body: "AIの要約や説明には、誤りや情報の更新遅れがあり得ます。大事な点は、区の公式資料でもご確認ください。",
  },
] as const;

const PROMISES = [
  {
    stat: "無料",
    title: "参加費0円",
    body: "参加費はかかりません。",
  },
  {
    stat: "年齢不問",
    title: "どの世代も参加できます",
    body: "若い世代が呼びかける会ですが、年齢の制限はありません。",
  },
  {
    stat: "AI不要",
    title: "AIインタビューは使わなくても大丈夫",
    body: "AIインタビューをしていなくても、申し込み・参加できます。",
  },
  {
    stat: "聴くだけも歓迎",
    title: "まとまった意見はいりません",
    body: "専門知識がなくても、話すのが苦手でも大丈夫です。",
  },
] as const;

const PROMISE_DETAILS: Record<
  (typeof YOUTH_DIALOGUE_PROMISES)[number],
  string
> = {
  異なる意見を尊重する:
    "考えがちがうのは当たり前。まずは相手の話を最後まで聴くところから始めます。",
  "個人が特定される情報や発言を、許可なく外部に公開しない":
    "会の中で聞いた話を、本人の許可なくSNSなどで広めないでください。",
  運営スタッフの案内に従う:
    "会場の使い方や進行について、運営スタッフの案内にご協力ください。",
};

const FAQS = [
  {
    question: "AIインタビューをしていなくても参加できますか？",
    answer:
      "はい。AIインタビューの利用は参加の条件ではありません。はじめての方も、そのままお申し込みください。",
  },
  {
    question: "話すのが苦手でも参加できますか？",
    answer:
      "はい。まとまった意見や専門知識は必要ありません。ほかの人の話を聴くことを中心にした参加も歓迎します。",
  },
  {
    question: "どの年代が参加できますか？",
    answer:
      "年齢の制限はありません。若い世代が呼びかける会ですが、どの世代の方も参加できます。",
  },
  {
    question: "どのテーマについて話しますか？",
    answer: `${YOUTH_DIALOGUE_TOPICS.join("、")}の6つを話題の例にしています。当日すべての分野を詳しく扱うとは限らず、参加者それぞれの関心を持ち寄って話します。`,
  },
] as const;

export function YouthDialogueEventPage({
  registrationStatus,
}: {
  registrationStatus: RegistrationStatus;
}) {
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
  const isOpen = registrationStatus === "open";

  return (
    <div
      className={cn(
        "bg-white text-mirai-text",
        isOpen ? "pb-[120px] pc:pb-[110px]" : "pb-16"
      )}
    >
      {/* ヒーロー：写真に濃い青を重ね、白い文字で置く */}
      <section
        aria-labelledby="event-title"
        className="relative overflow-hidden bg-primary-strong"
      >
        <Image
          src={HERO_PHOTO}
          alt=""
          fill
          priority
          sizes="(min-width: 1180px) 1180px, 100vw"
          className="object-cover"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-linear-105 from-primary-strong/95 via-primary-strong/90 via-55% to-primary-strong/55"
        />
        <div className="relative mx-auto max-w-[1080px] px-5 py-10 text-white md:px-14 md:py-[72px]">
          <p className="inline-flex rounded-full bg-white/20 px-[18px] py-[7px] text-xs font-bold tracking-[0.08em]">
            {EVENT.dateLabel} ／ {EVENT.venueName}
          </p>
          <p className="mt-5 flex items-center gap-2 text-base font-bold tracking-[0.06em] md:text-lg">
            <MessagesSquare aria-hidden="true" className="size-5" />
            {EVENT.name}
          </p>
          <h1
            id="event-title"
            className="mt-3 text-[1.75rem] font-bold leading-[1.5] tracking-[0.04em] md:text-[3.25rem]"
          >
            世田谷の気になることを、
            <br />
            世代をこえて話そう。
          </h1>
          <p className="mt-4 max-w-[640px] text-sm font-medium leading-[1.9] md:mt-5 md:text-base">
            暮らしやまちで気になっていることを、年齢や立場のちがう人と話し、聴き合う2時間。
            <br />
            {EVENT.dateLabel} {EVENT.timeLabel}・{EVENT.venueName}
            {EVENT.roomName}・参加費{EVENT.fee}
          </p>
          <a
            href="#outline"
            className="mt-7 inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/15 px-[34px] py-[15px] text-[15px] font-bold tracking-[0.04em] text-white hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            会の内容を見る
            <ArrowDown aria-hidden="true" className="size-4" />
          </a>
        </div>
      </section>

      {/* 導入の一文 */}
      <section
        aria-label="この会について"
        className="mx-auto max-w-[900px] px-5 pt-12 pb-7 text-center md:px-9"
      >
        <p className="text-base font-bold leading-[2] tracking-[0.04em] md:text-lg">
          「{EVENT.name}」は、まちのことを“聞かされる人”ではなく
          <br className="hidden md:inline" />
          “話し合う人”になる会です。
        </p>
        <p className="mt-4 text-sm leading-[2] text-mirai-text-secondary">
          暮らしの困りごとも、ふと感じた疑問も。
          <br />
          <strong className="text-primary-strong">
            専門知識やまとまった意見がなくても、世代をこえて話し、聴き合います。
          </strong>
        </p>
      </section>

      {/* 開催概要 */}
      <section
        id="outline"
        aria-labelledby="outline-heading"
        className="mx-auto max-w-[900px] scroll-mt-24 px-5 pt-10 pb-7 md:px-9"
      >
        <SectionHeading id="outline-heading" eyebrow="Outline">
          開催概要
        </SectionHeading>
        <dl className="mt-8 overflow-hidden rounded-[18px] border border-mirai-border bg-white shadow-sm">
          <OutlineRow label="イベント名">{EVENT.name}</OutlineRow>
          <OutlineRow label="日時">
            {EVENT.dateLabel} {EVENT.timeLabel}
          </OutlineRow>
          <OutlineRow label="会場">
            {EVENT.venueName} {EVENT.roomName}
            <span className="block text-xs leading-[1.8] text-mirai-text-muted">
              {EVENT.address}
              <br />
              {EVENT.access.join(" ／ ")}
            </span>
            <a
              href={EVENT.facilityUrl}
              target="_blank"
              rel="noreferrer"
              className={cn(
                "mt-1 inline-flex items-center gap-1 text-xs font-bold text-primary-strong underline underline-offset-4",
                FOCUS_STRONG
              )}
            >
              施設案内（世田谷区のサイト）
              <ExternalLink aria-hidden="true" className="size-3.5" />
              <span className="sr-only">（新しいタブで開きます）</span>
            </a>
          </OutlineRow>
          <OutlineRow label="設備">
            区の施設案内では、エレベーターや車いす用トイレなどが案内されています。
          </OutlineRow>
          <OutlineRow label="対象">どの世代も参加できます</OutlineRow>
          <OutlineRow label="参加費">{EVENT.fee}</OutlineRow>
          <OutlineRow label="申込">
            Googleフォーム（「参加を申し込む」ボタンから）
          </OutlineRow>
          <OutlineRow label="お問い合わせ">
            <a
              href={`mailto:${EVENT.contactEmail}`}
              className={cn(
                "font-bold text-primary-strong underline underline-offset-4",
                FOCUS_STRONG
              )}
            >
              {EVENT.contactEmail}
            </a>
          </OutlineRow>
        </dl>
      </section>

      {/* こんな方におすすめ */}
      <section
        aria-labelledby="recommend-heading"
        className="mx-auto max-w-[900px] px-5 py-12 md:px-9 md:py-16"
      >
        <h2
          id="recommend-heading"
          className="text-center text-[1.625rem] font-bold leading-[1.6] tracking-[0.04em] md:text-[2rem]"
        >
          こんな方に
          <br />
          おすすめです。
        </h2>
        <ul className="mt-8 grid gap-[14px]">
          {RECOMMENDS.map((item) => (
            <li
              key={item}
              className="flex items-center gap-4 rounded-[12px] bg-mirai-surface px-[22px] py-[18px]"
            >
              <span className="flex size-[26px] shrink-0 items-center justify-center rounded-full bg-mirai-gradient-end text-primary-strong">
                <Check aria-hidden="true" className="size-4" strokeWidth={3} />
              </span>
              <p className="text-[15px] leading-[1.7] text-mirai-text-secondary">
                {item}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {/* この会で大切にしたいこと */}
      <section
        aria-labelledby="aim-heading"
        className="bg-mirai-gradient-end py-14 md:py-[84px]"
      >
        <div className="mx-auto max-w-[1000px] px-5 md:px-9">
          <SectionHeading id="aim-heading" eyebrow="Aim">
            この会で大切にしたいこと
          </SectionHeading>
          <ul className="mt-8 grid gap-5 md:grid-cols-3 md:gap-[23px]">
            {AIMS.map((aim) => (
              <li
                key={aim.kanji}
                className="flex flex-col gap-[14px] rounded-2xl bg-white p-7 shadow-sm"
              >
                <span
                  aria-hidden="true"
                  className="flex size-11 items-center justify-center rounded-[12px] border border-black bg-mirai-gradient text-xl font-bold"
                >
                  {aim.kanji}
                </span>
                <h3 className="text-lg font-bold leading-[1.45] tracking-[0.03em]">
                  {aim.title}
                </h3>
                <p className="text-[13px] leading-[1.9] text-mirai-text-secondary">
                  {aim.body}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 申込から当日までの流れ */}
      <section
        aria-labelledby="flow-heading"
        className="mx-auto max-w-[900px] px-5 py-14 md:px-9 md:py-[84px]"
      >
        <SectionHeading id="flow-heading" eyebrow="Flow">
          申込から当日までの流れ
        </SectionHeading>
        <ol className="mt-8 grid gap-[14px]">
          <FlowStep
            step="STEP 1"
            title="Googleフォームで申し込む"
            description="「参加を申し込む」ボタンからGoogleフォームへ進み、送信します。"
          >
            <div className="rounded-[10px] border border-mirai-border bg-white px-4 py-[13px]">
              <p className="text-sm font-bold tracking-[0.03em]">
                フォームでおたずねすること
              </p>
              <ul className="mt-1 list-disc pl-[15px] text-[12.5px] leading-[1.85] text-mirai-text-secondary">
                <li>
                  関心のある分野（民泊・いじめ・高齢者福祉・介護・障がい理解・交通問題・防災から）
                </li>
                <li>参加時の3つの約束への同意</li>
              </ul>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Tag>参加費 無料</Tag>
              <Tag tone="neutral">申込 Googleフォーム</Tag>
            </div>
          </FlowStep>
          <FlowStep
            step="STEP 2"
            title="当日、会場へ"
            description="太子堂区民センターの第二会議室に集まり、世代をこえて話し、聴き合います。"
          >
            <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 rounded-[10px] border border-mirai-border bg-white px-[15px] py-[11px]">
              <span className="font-lexend text-[15px] font-semibold text-primary-strong">
                10.03
              </span>
              <span className="text-sm font-bold tracking-[0.03em]">
                {EVENT.dateLabel}
              </span>
              <span className="text-[13px] font-bold tracking-[0.03em] text-primary-strong">
                {EVENT.timeLabel}
              </span>
            </div>
            <div className="mt-3 rounded-[10px] border border-mirai-border bg-white px-[15px] py-[11px]">
              <p className="text-[13px] font-bold tracking-[0.03em]">
                会場 {EVENT.venueName} {EVENT.roomName}
              </p>
              <p className="text-xs leading-[1.7] text-mirai-text-muted">
                {EVENT.access.join(" ／ ")}
              </p>
            </div>
          </FlowStep>
          <FlowStep
            step="STEP 3"
            title="気づきや問いを持ち帰る"
            description="話して、聴いて、気づいたことや新しく生まれた問いを、それぞれが持ち帰ります。"
          />
        </ol>
      </section>

      {/* この会の背景 */}
      <section
        aria-labelledby="background-heading"
        className="mx-auto max-w-[1000px] px-5 py-14 md:px-9 md:py-[84px]"
      >
        <SectionHeading
          id="background-heading"
          eyebrow="Background"
          lead="このページは、世田谷区議会の話題をやさしく紹介するWebサイト「みらい議会＠世田谷区」に掲載しています。"
        >
          この会の背景
        </SectionHeading>
        <ul className="mt-8 grid gap-6 md:grid-cols-3 md:gap-7">
          {BACKGROUND_CARDS.map((card) => (
            <li
              key={card.title}
              className="flex flex-col rounded-2xl border border-mirai-border bg-white px-[14px] pt-[14px] pb-5 shadow-sm"
            >
              <div className="relative aspect-square overflow-hidden rounded-[14px]">
                <Image
                  src={card.image}
                  alt=""
                  fill
                  sizes="(min-width: 700px) 300px, 100vw"
                  className="object-cover"
                />
              </div>
              <Tag tone="strong" className="mt-4 self-start">
                {card.tag}
              </Tag>
              <h3 className="mt-2 text-lg font-bold leading-[1.45] tracking-[0.06em]">
                {card.title}
              </h3>
              <p className="mt-1 text-xs leading-[1.8] text-mirai-text-secondary">
                {card.body}
              </p>
            </li>
          ))}
        </ul>
        <div className="mt-8 flex flex-col items-center gap-3">
          <Link
            href={routes.publicCommentMinpaku()}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border border-mirai-border bg-white px-8 py-[13px] text-sm font-bold tracking-[0.03em] text-mirai-text-secondary hover:bg-mirai-surface",
              FOCUS_STRONG
            )}
          >
            AIインタビューの例を見る（民泊）
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
          <p className="text-sm font-bold leading-7">
            この会への参加に、AIインタビューの利用は必要ありません。
          </p>
        </div>
      </section>

      {/* この会の約束 */}
      <section
        aria-labelledby="promise-heading"
        className="mx-auto max-w-[1000px] px-5 py-14 md:px-9 md:py-[72px]"
      >
        <SectionHeading id="promise-heading" eyebrow="Promise">
          この会の約束
        </SectionHeading>
        <ul className="mt-8 grid gap-5 md:grid-cols-2 pc:grid-cols-3 pc:gap-[22px]">
          {PROMISES.map((promise) => (
            <li
              key={promise.stat}
              className="rounded-2xl border border-mirai-border bg-white p-7 shadow-sm"
            >
              <p className="text-[1.625rem] font-bold leading-[1.45] text-primary-strong">
                {promise.stat}
              </p>
              <h3 className="mt-1 text-base font-bold leading-[1.45]">
                {promise.title}
              </h3>
              <p className="mt-2 text-xs leading-[1.85] text-mirai-text-secondary">
                {promise.body}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {/* 参加時の約束 */}
      <section
        aria-labelledby="requirements-heading"
        className="bg-mirai-surface py-14 md:py-[84px]"
      >
        <div className="mx-auto max-w-[820px] px-5 md:px-9">
          <SectionHeading id="requirements-heading" eyebrow="Requirements">
            参加時の約束
          </SectionHeading>
          <p className="mt-6 text-center text-sm leading-[2] text-mirai-text-secondary">
            だれもが安心して話せる場にするため、
            <br className="hidden md:inline" />
            申込フォームで次の3つへの同意をお願いしています。
          </p>
          <ol className="mt-6 grid gap-[14px]">
            {YOUTH_DIALOGUE_PROMISES.map((promise, index) => (
              <li
                key={promise}
                className="flex gap-4 rounded-[14px] border border-mirai-border bg-white px-6 py-[22px]"
              >
                <span
                  aria-hidden="true"
                  className="flex size-[30px] shrink-0 items-center justify-center rounded-full bg-primary-strong font-lexend text-sm font-semibold text-white"
                >
                  {index + 1}
                </span>
                <div>
                  <h3 className="font-mirai-serif text-base font-semibold leading-[1.6]">
                    {promise}
                  </h3>
                  <p className="mt-1 text-[13px] leading-[1.9] text-mirai-text-secondary">
                    {PROMISE_DETAILS[promise]}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* お申し込みについて */}
      <section
        aria-labelledby="application-heading"
        className="mx-auto max-w-[820px] px-5 pt-14 pb-7 md:px-9 md:pt-[84px]"
      >
        <SectionHeading id="application-heading" eyebrow="Application">
          お申し込みについて
        </SectionHeading>
        <div className="mt-8 flex flex-col gap-4 rounded-[18px] border border-mirai-border bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-[12px] bg-mirai-gradient-end px-[18px] py-[14px]">
            <span className="text-[11px] font-bold tracking-[0.08em] text-primary-strong">
              申込方法
            </span>
            <span className="text-[1.375rem] font-bold tracking-[0.04em]">
              Googleフォーム
            </span>
          </div>
          <p className="text-sm leading-[1.9]">
            「参加を申し込む」ボタンから、Googleフォームへ移動します。
          </p>
          <div className="flex flex-col gap-2.5">
            <div className="flex items-start gap-3">
              <Tag className="shrink-0">フォーム</Tag>
              <p className="mt-0.5 text-[13px] leading-[1.9] text-mirai-text-secondary">
                回答はGoogleフォーム側で管理され、このサイトには保存されません。取得する項目や使い道は、フォーム内の説明でご確認ください。
              </p>
            </div>
            <div className="flex items-start gap-3">
              <Tag tone="neutral" className="shrink-0">
                計測
              </Tag>
              <p className="mt-0.5 text-[13px] leading-[1.9] text-mirai-text-secondary">
                広告の効果を知るために、このページへの訪問と「参加を申し込む」ボタンのクリックを記録します。メールアドレスやお名前、AIインタビューの回答内容は計測に使わず、申込とAIインタビューの利用者を個人単位で結び付けません。
              </p>
            </div>
          </div>
          <ApplyAction href={applyHref} status={registrationStatus} />
          <p className="text-xs leading-[1.9] text-mirai-text-muted">
            ＊お預かりする情報の扱いは
            <Link
              href={routes.privacy()}
              className={cn(
                "mx-0.5 text-primary-strong underline underline-offset-4",
                FOCUS_STRONG
              )}
            >
              プライバシーポリシー
            </Link>
            をご覧ください。
          </p>
        </div>
      </section>

      {/* よくあるご質問 */}
      <section
        aria-labelledby="faq-heading"
        className="mx-auto max-w-[820px] px-5 pt-5 pb-14 md:px-9 md:pb-16"
      >
        <SectionHeading id="faq-heading" eyebrow="FAQ">
          よくあるご質問
        </SectionHeading>
        <div className="mt-8 grid gap-3">
          {FAQS.map((faq) => (
            <details
              key={faq.question}
              className="group rounded-[12px] border border-mirai-border bg-white"
            >
              <summary
                className={cn(
                  "flex cursor-pointer list-none items-center gap-[14px] rounded-[12px] px-5 py-[18px] [&::-webkit-details-marker]:hidden",
                  FOCUS_STRONG
                )}
              >
                <span
                  aria-hidden="true"
                  className="flex size-6 shrink-0 items-center justify-center rounded-full bg-mirai-gradient-end font-lexend text-xs font-semibold text-primary-strong"
                >
                  Q
                </span>
                <span className="flex-1 text-sm font-bold leading-[1.6]">
                  {faq.question}
                </span>
                <Plus
                  aria-hidden="true"
                  className="size-[18px] shrink-0 text-mirai-text-muted transition-transform group-open:rotate-45"
                />
              </summary>
              <p className="pr-5 pb-5 pl-[58px] text-[13px] leading-[1.9] text-mirai-text-secondary">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* 最終の申込パネル */}
      <section
        aria-labelledby="final-heading"
        className="mx-auto max-w-[1080px] px-5 pb-9 md:px-9"
      >
        <div className="rounded-[20px] bg-mirai-gradient px-6 py-12 text-center shadow-sm md:py-[50px]">
          <h2
            id="final-heading"
            className="text-[1.5rem] font-bold leading-[1.6] tracking-[0.04em] md:text-[1.875rem]"
          >
            気になっていることを、
            <br className="md:hidden" />
            持ってきてください。
          </h2>
          <p className="mx-auto mt-5 max-w-[600px] text-sm font-medium leading-[1.9]">
            {EVENT.dateLabel} {EVENT.timeLabel}、{EVENT.venueName}
            で待っています。
            <br />
            参加費は{EVENT.fee}です。
          </p>
          <p className="mx-auto mt-2 max-w-[560px] text-[13px] leading-[1.9] text-mirai-text-secondary">
            どの世代も参加できます。専門知識やまとまった意見は必要なく、聴くことが中心の参加も歓迎します。AIインタビューをしていなくても申し込めます。
          </p>
          <div className="mt-7">
            <ApplyAction
              href={applyHref}
              status={registrationStatus}
              variant="panel"
            />
          </div>
        </div>
      </section>

      {/* ほかのページへ */}
      <nav
        aria-label="関連ページ"
        className="mx-auto flex max-w-[1080px] flex-wrap justify-center gap-3 px-5 pt-5 pb-14 md:px-9"
      >
        <Link
          href={routes.publicComments()}
          className={cn(
            "inline-flex items-center gap-2 rounded-full border border-mirai-border bg-white px-[30px] py-[14px] text-sm font-bold tracking-[0.03em] text-mirai-text-secondary hover:bg-mirai-surface",
            FOCUS_STRONG
          )}
        >
          パブリックコメントとAIインタビューの一覧
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
        <Link
          href={routes.home()}
          className={cn(
            "inline-flex items-center gap-2 rounded-full border border-mirai-border bg-white px-[30px] py-[14px] text-sm font-bold tracking-[0.03em] text-mirai-text-secondary hover:bg-mirai-surface",
            FOCUS_STRONG
          )}
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          みらい議会＠世田谷区のトップへ
        </Link>
      </nav>

      {/* 画面下に固定した申込ボタン（スマホでは下部ナビの上に置く） */}
      {isOpen && (
        <div className="fixed inset-x-0 bottom-[calc(var(--mobile-primary-navigation-height)+env(safe-area-inset-bottom,0px))] z-20 bg-linear-to-t from-mirai-text/15 to-transparent px-5 pt-3 pb-3 pc:bottom-0">
          <div className="mx-auto max-w-[600px]">
            <ApplyAction
              href={applyHref}
              status={registrationStatus}
              variant="sticky"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ApplyAction({
  href,
  status,
  variant = "box",
}: {
  href: string;
  status: RegistrationStatus;
  variant?: "box" | "panel" | "sticky";
}) {
  const noteId = useId();

  if (status !== "open") {
    return (
      <p className="rounded-2xl bg-mirai-surface px-5 py-4 text-center font-bold leading-7">
        {CLOSED_MESSAGES[status]}
      </p>
    );
  }

  if (variant === "sticky") {
    return (
      <>
        <Button
          asChild
          className="h-auto w-full flex-col gap-0.5 py-2.5 shadow-md focus-visible:ring-primary-strong"
        >
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            aria-describedby={noteId}
          >
            <span
              aria-hidden="true"
              className="text-[11px] font-bold tracking-[0.04em]"
            >
              ＼ 10/3（土）14:00〜・参加無料・申込はGoogleフォーム ／
            </span>
            <span className="inline-flex items-center gap-2 text-base tracking-[0.05em]">
              参加を申し込む
              <ArrowRight aria-hidden="true" className="size-4" />
            </span>
          </a>
        </Button>
        <span id={noteId} className="sr-only">
          {APPLY_NOTE}
        </span>
      </>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <Button
        asChild
        // グラデーションの面の上では、白地に黒枠のボタンにする（デザインシステムの規則）
        variant={variant === "panel" ? "outline" : "default"}
        className={cn(
          "h-auto py-[17px] text-base tracking-[0.05em] focus-visible:ring-primary-strong",
          variant === "box" ? "w-full" : "px-[46px]"
        )}
      >
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          aria-describedby={noteId}
        >
          参加を申し込む
          <ArrowRight aria-hidden="true" className="size-4" />
        </a>
      </Button>
      <p id={noteId} className="text-xs leading-6 text-mirai-text-secondary">
        {APPLY_NOTE}
      </p>
    </div>
  );
}

function SectionHeading({
  id,
  eyebrow,
  lead,
  children,
}: {
  id: string;
  eyebrow: string;
  lead?: string;
  children: ReactNode;
}) {
  return (
    <div className="text-center">
      <span
        aria-hidden="true"
        className="mx-auto block h-[3px] w-[46px] bg-gradient-to-r from-primary to-primary-accent"
      />
      <h2
        id={id}
        className="mt-[22px] text-[1.625rem] font-bold leading-[1.45] tracking-[0.08em] md:text-[1.875rem]"
      >
        {children}
      </h2>
      <p
        aria-hidden="true"
        className="mt-1 font-lexend text-[11px] font-medium tracking-[0.14em] text-primary-strong"
      >
        {eyebrow}
      </p>
      {lead && (
        <p className="mx-auto mt-5 max-w-[640px] text-sm leading-[1.9] text-mirai-text-secondary">
          {lead}
        </p>
      )}
    </div>
  );
}

function Tag({
  tone = "soft",
  className,
  children,
}: {
  tone?: "soft" | "neutral" | "strong";
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-[14px] py-1.5 text-[11px] font-bold leading-4 tracking-[0.06em]",
        tone === "soft" && "bg-mirai-gradient-end text-primary-strong",
        tone === "neutral" &&
          "bg-mirai-surface-light text-mirai-text-secondary",
        tone === "strong" && "bg-primary-strong text-white",
        className
      )}
    >
      {children}
    </span>
  );
}

function FlowStep({
  step,
  title,
  description,
  children,
}: {
  step: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <li className="flex flex-col gap-3 rounded-[14px] bg-mirai-surface px-5 py-[22px] sm:flex-row sm:gap-[18px] md:px-6">
      <span className="self-start rounded-full bg-primary-strong px-[14px] py-1.5 font-lexend text-[11px] font-semibold tracking-[0.06em] text-white">
        {step}
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="text-base font-bold leading-[1.45]">{title}</h3>
        <p className="mt-1 text-[13px] leading-[1.9] text-mirai-text-secondary">
          {description}
        </p>
        {children && <div className="mt-[14px]">{children}</div>}
      </div>
    </li>
  );
}

function OutlineRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid border-b border-mirai-border last:border-b-0 sm:grid-cols-[140px_minmax(0,1fr)]">
      <dt className="bg-mirai-surface px-[22px] pt-4 pb-1 text-xs font-bold tracking-[0.06em] text-mirai-text-muted sm:py-5">
        {label}
      </dt>
      <dd className="px-[22px] pt-1 pb-4 text-sm leading-[1.8] sm:px-6 sm:py-5">
        {children}
      </dd>
    </div>
  );
}
