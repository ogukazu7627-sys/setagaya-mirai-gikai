"use client";

import { ArrowRight, CalendarDays, Check, MapPin, Users } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { usePublicCommentAttribution } from "@/features/public-comment/shared/client/use-public-comment-attribution";
import { YOUTH_DIALOGUE_INTERESTS } from "@/features/public-comment/shared/funnel";
import { routes } from "@/lib/routes";

type RegistrationState = "idle" | "sending" | "complete" | "error";

const AGREEMENTS = [
  "意見や立場の違いを尊重し、相手を否定したり、無理に説得したりしません。",
  "会の中で知った個人情報や、個人が特定できる発言内容を、本人の許可なく外部に公開しません。",
  "安全な運営のため、必要に応じてスタッフからのお願いに従います。",
] as const;

export function YouthDialogueEventPage() {
  const { ensureAttribution } = usePublicCommentAttribution({
    journeyType: "event_direct",
    adTheme: "event-direct",
  });
  const [publicToken, setPublicToken] = useState<string | null>(null);
  const [registrationState, setRegistrationState] =
    useState<RegistrationState>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void ensureAttribution().then((token) => {
      if (active) setPublicToken(token);
    });
    return () => {
      active = false;
    };
  }, [ensureAttribution]);

  const applyHref = publicToken
    ? `/events/youth-dialogue-2026-10-03/apply?attribution=${encodeURIComponent(publicToken)}`
    : "#registration";

  const submitRegistration = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (registrationState === "sending") return;
    setRegistrationState("sending");
    setError(null);
    const formData = new FormData(event.currentTarget);
    const interests = formData.getAll("interests");
    if (interests.length === 0) {
      setRegistrationState("error");
      setError("興味のある分野を1つ以上選んでください。");
      return;
    }
    const token = publicToken ?? (await ensureAttribution());
    if (!token) {
      setRegistrationState("error");
      setError(
        "申込情報を保存できませんでした。ページを再読み込みしてください。"
      );
      return;
    }

    try {
      const response = await fetch(
        "/api/events/youth-dialogue-2026-10-03/register",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            publicToken: token,
            attendeeName: formData.get("attendeeName"),
            email: formData.get("email"),
            interests,
            agreementsAccepted: formData.getAll("agreements").length === 3,
            note: formData.get("note"),
            website: formData.get("website"),
          }),
        }
      );
      const data = await response.json().catch(() => null);
      if (!response.ok)
        throw new Error(data?.error ?? "申込を保存できませんでした");
      setRegistrationState("complete");
    } catch (caught) {
      setRegistrationState("error");
      setError(
        caught instanceof Error ? caught.message : "申込を保存できませんでした"
      );
    }
  };

  return (
    <div className="bg-[#f4fbff] pb-24 text-slate-900">
      <section className="border-b border-sky-100 bg-gradient-to-b from-sky-100 to-white px-4 py-14 md:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-bold tracking-[0.15em] text-sky-700">
            みらい議会＠世田谷区
          </p>
          <h1 className="mt-5 text-3xl font-bold leading-relaxed md:text-5xl">
            AIに話したその続きを、
            <br className="hidden sm:block" />
            今度は人と話してみませんか。
          </h1>
          <p className="mt-5 text-xl font-bold text-sky-800">
            若者と地域を語る会
          </p>
          <p className="mx-auto mt-5 max-w-2xl leading-8 text-slate-700">
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
            <a href={applyHref}>
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
        <div className="mx-auto max-w-2xl rounded-3xl border border-sky-100 bg-white p-6 shadow-sm md:p-10">
          {registrationState === "complete" ? (
            <div className="py-8 text-center" aria-live="polite">
              <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <Check className="size-6" />
              </span>
              <h2 className="mt-5 text-2xl font-bold">
                お申し込みが完了しました
              </h2>
              <p className="mt-4 leading-8 text-slate-700">
                10月3日（土）14:00、太子堂区民センターでお待ちしています。
              </p>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold">参加申込</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                入力内容はイベントの連絡・安全な運営と、広告から来場までの集計にのみ使用し、公開しません。
              </p>
              <form className="mt-7 space-y-6" onSubmit={submitRegistration}>
                <div className="hidden" aria-hidden="true">
                  <label htmlFor="website">ウェブサイト</label>
                  <input
                    id="website"
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                  />
                </div>
                <Field label="お名前" htmlFor="attendeeName">
                  <input
                    id="attendeeName"
                    name="attendeeName"
                    required
                    maxLength={100}
                    autoComplete="name"
                    className="mt-2 min-h-12 w-full rounded-xl border px-4"
                  />
                </Field>
                <Field label="メールアドレス" htmlFor="email">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    maxLength={254}
                    autoComplete="email"
                    className="mt-2 min-h-12 w-full rounded-xl border px-4"
                  />
                </Field>
                <fieldset>
                  <legend className="font-bold">
                    興味のある分野（1つ以上）
                  </legend>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {YOUTH_DIALOGUE_INTERESTS.map((interest) => (
                      <label
                        key={interest}
                        className="flex items-center gap-3 rounded-xl border p-3"
                      >
                        <input
                          type="checkbox"
                          name="interests"
                          value={interest}
                          className="size-4"
                        />
                        <span>{interest}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <fieldset>
                  <legend className="font-bold">参加にあたっての約束</legend>
                  <div className="mt-3 space-y-3">
                    {AGREEMENTS.map((agreement) => (
                      <label
                        key={agreement}
                        className="flex items-start gap-3 rounded-xl bg-slate-50 p-4 text-sm leading-6"
                      >
                        <input
                          type="checkbox"
                          name="agreements"
                          value={agreement}
                          required
                          className="mt-1 size-4 shrink-0"
                        />
                        <span>{agreement}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <Field
                  label="参加にあたって伝えておきたいこと（任意）"
                  htmlFor="note"
                >
                  <textarea
                    id="note"
                    name="note"
                    maxLength={1000}
                    rows={4}
                    className="mt-2 w-full rounded-xl border p-4"
                  />
                </Field>
                {error ? (
                  <p
                    className="rounded-xl bg-red-50 p-4 text-sm text-red-700"
                    role="alert"
                  >
                    {error}
                  </p>
                ) : null}
                <Button
                  type="submit"
                  disabled={registrationState === "sending"}
                  className="min-h-12 w-full rounded-full text-base"
                >
                  {registrationState === "sending"
                    ? "送信中…"
                    : "この内容で申し込む"}
                </Button>
                <p className="text-xs leading-6 text-slate-500">
                  送信前に
                  <Link href={routes.privacy()} className="mx-1 underline">
                    プライバシーポリシー
                  </Link>
                  をご確認ください。
                </p>
              </form>
            </>
          )}
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
    <div className="flex gap-3 rounded-2xl border border-sky-100 bg-white/90 p-4 text-sm font-medium leading-6">
      <span className="mt-0.5 text-sky-700">{icon}</span>
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
      <h2 className="font-bold text-sky-800">{title}</h2>
      <p className="mt-3 text-sm leading-7 text-slate-700">{children}</p>
    </article>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="font-bold">
        {label}
      </label>
      {children}
    </div>
  );
}
