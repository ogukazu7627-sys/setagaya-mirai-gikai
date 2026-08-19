import { Compass, FileText, Home, Landmark } from "lucide-react";
import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";
import { Container } from "@/components/layouts/container";
import { routes } from "@/lib/routes";

export const metadata: Metadata = {
  title: "ページが見つかりません | みらい議会＠世田谷区",
  robots: { index: false, follow: false },
};

const DESTINATIONS = [
  {
    href: routes.home(),
    icon: Home,
    label: "ホーム",
    description: "今日のおすすめや最新の動きを見る",
  },
  {
    href: routes.bills(),
    icon: Landmark,
    label: "議会",
    description: "議案・質問・請願・報告事項を探す",
  },
  {
    href: routes.budget(),
    icon: Compass,
    label: "触れる予算",
    description: "分野から令和8年度当初予算をたどる",
  },
  {
    href: routes.councilors(),
    icon: FileText,
    label: "議員",
    description: "議員のプロフィールと発言を見る",
  },
] as const;

export default function NotFound() {
  return (
    <main className="min-h-dvh bg-mirai-surface py-16">
      <Container className="flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          <p className="text-sm font-bold text-primary">404</p>
          <h1 className="text-[28px] font-bold leading-[1.4] text-mirai-text">
            ページが見つかりません
          </h1>
          <p className="text-sm leading-relaxed text-mirai-text-secondary">
            URLが変更されたか、削除された可能性があります。
            <br />
            お探しの内容は、次のいずれかから見つかるかもしれません。
          </p>
        </div>

        <ul className="grid gap-3 sm:grid-cols-2">
          {DESTINATIONS.map((destination) => (
            <li key={destination.href}>
              <Link
                href={destination.href as Route}
                className="flex min-h-20 items-start gap-3 rounded-lg border border-mirai-border bg-white p-4 transition-colors hover:bg-mirai-surface focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
              >
                <destination.icon
                  aria-hidden="true"
                  className="mt-0.5 size-5 shrink-0 text-primary"
                />
                <span className="flex flex-col gap-1">
                  <span className="font-bold text-mirai-text">
                    {destination.label}
                  </span>
                  <span className="text-xs leading-relaxed text-mirai-text-secondary">
                    {destination.description}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </main>
  );
}
