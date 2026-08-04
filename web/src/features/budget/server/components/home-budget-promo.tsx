import "server-only";

import { ArrowRight, BookOpen, Sparkles, WalletCards } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { Container } from "@/components/layouts/container";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";

const stars = [
  { left: "8%", top: "18%", size: "3px", opacity: 0.58 },
  { left: "18%", top: "72%", size: "2px", opacity: 0.45 },
  { left: "31%", top: "24%", size: "2px", opacity: 0.5 },
  { left: "55%", top: "12%", size: "3px", opacity: 0.62 },
  { left: "72%", top: "76%", size: "2px", opacity: 0.48 },
  { left: "88%", top: "32%", size: "3px", opacity: 0.55 },
] as const;

const nodes = [
  {
    label: "教育",
    left: "17%",
    top: "28%",
    tone: "bg-budget-node-cyan text-budget-space-deep",
    size: "size-16",
  },
  {
    label: "福祉",
    left: "58%",
    top: "20%",
    tone: "bg-budget-node-gold text-budget-space-deep",
    size: "size-14",
  },
  {
    label: "子育て",
    left: "36%",
    top: "62%",
    tone: "bg-budget-node-mint text-budget-space-deep",
    size: "size-20",
  },
  {
    label: "防災",
    left: "76%",
    top: "58%",
    tone: "bg-budget-space-line text-budget-space-deep",
    size: "size-14",
  },
] as const;

export function HomeBudgetPromo() {
  return (
    <section
      aria-labelledby="home-budget-promo-title"
      className="bg-white pb-12"
    >
      <Container>
        <div className="overflow-hidden rounded-lg border border-budget-space-line bg-budget-space-deep shadow-sm">
          <div className="grid gap-0 min-[768px]:grid-cols-[minmax(0,1fr)_300px]">
            <div className="px-5 py-6 sm:px-7 sm:py-8">
              <p className="inline-flex items-center gap-2 text-sm font-bold text-budget-space-eyebrow">
                <WalletCards aria-hidden="true" className="size-4" />
                触れる予算
              </p>
              <h2
                id="home-budget-promo-title"
                className="mt-3 text-2xl font-bold leading-[1.35] text-white sm:text-3xl"
              >
                世田谷区の予算を、暮らしのテーマから見てみる
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-budget-space-copy sm:text-base">
                令和8年度当初予算を、教育・子育て・福祉などの分野や自然な言葉から探せます。
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button
                  asChild
                  className="border-budget-node-cyan bg-budget-node-cyan text-budget-space-deep hover:bg-budget-node-mint hover:opacity-100"
                >
                  <Link href={routes.budget() as Route}>
                    予算マップを開く
                    <ArrowRight aria-hidden="true" className="size-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="border-budget-space-line bg-transparent text-white hover:bg-white/10"
                >
                  <Link href={routes.budgetAll() as Route}>
                    <BookOpen aria-hidden="true" className="size-4" />
                    公式分類で見る
                  </Link>
                </Button>
              </div>
            </div>

            <div
              aria-hidden="true"
              className="relative min-h-52 overflow-hidden border-t border-budget-space-line/40 bg-[var(--budget-v2-void)] min-[768px]:min-h-full min-[768px]:border-t-0 min-[768px]:border-l"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_35%,color-mix(in_srgb,var(--budget-space-light)_45%,transparent),transparent_38%),radial-gradient(circle_at_80%_75%,color-mix(in_srgb,var(--budget-node-mint)_22%,transparent),transparent_32%)]" />
              <div className="absolute inset-0 bg-[linear-gradient(color-mix(in_srgb,var(--budget-space-line)_8%,transparent)_1px,transparent_1px),linear-gradient(90deg,color-mix(in_srgb,var(--budget-space-line)_8%,transparent)_1px,transparent_1px)] bg-[length:42px_42px] opacity-50" />
              <svg
                className="absolute inset-0 h-full w-full"
                role="presentation"
                focusable="false"
              >
                <line
                  x1="24%"
                  y1="36%"
                  x2="48%"
                  y2="72%"
                  stroke="var(--budget-space-line)"
                  strokeOpacity="0.32"
                  strokeWidth="1.5"
                />
                <line
                  x1="66%"
                  y1="30%"
                  x2="48%"
                  y2="72%"
                  stroke="var(--budget-node-mint)"
                  strokeOpacity="0.28"
                  strokeWidth="1.5"
                />
                <line
                  x1="66%"
                  y1="30%"
                  x2="83%"
                  y2="66%"
                  stroke="var(--budget-node-gold)"
                  strokeOpacity="0.26"
                  strokeWidth="1.5"
                />
              </svg>
              {stars.map((star) => (
                <span
                  key={`${star.left}-${star.top}`}
                  className="absolute rounded-full bg-budget-node-cyan"
                  style={{
                    left: star.left,
                    top: star.top,
                    width: star.size,
                    height: star.size,
                    opacity: star.opacity,
                  }}
                />
              ))}
              {nodes.map((node) => (
                <span
                  key={node.label}
                  className={`absolute grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-xs font-bold shadow-[0_0_28px_color-mix(in_srgb,var(--budget-space-line)_35%,transparent)] ${node.size} ${node.tone}`}
                  style={{ left: node.left, top: node.top }}
                >
                  {node.label}
                </span>
              ))}
              <span className="absolute right-5 bottom-5 inline-flex items-center gap-1.5 rounded-full border border-budget-space-line/45 bg-budget-space-deep/75 px-3 py-1.5 text-xs font-bold text-budget-space-copy">
                <Sparkles aria-hidden="true" className="size-3.5" />
                6210億円の入口
              </span>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
