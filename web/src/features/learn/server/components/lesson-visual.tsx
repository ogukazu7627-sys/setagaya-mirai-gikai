import {
  ArrowLeftRight,
  ArrowRight,
  BarChart3,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Landmark,
  type LucideIcon,
  MessageSquareText,
  PenLine,
  Search,
  UsersRound,
  Video,
  Vote,
  WalletCards,
} from "lucide-react";
import type {
  LearnLessonIconName,
  LearnLessonTone,
  LearnLessonVisualStep,
} from "../../shared/learn-lessons";

const ICONS: Record<LearnLessonIconName, LucideIcon> = {
  "arrow-left-right": ArrowLeftRight,
  building: Building2,
  calendar: CalendarDays,
  chart: BarChart3,
  check: CheckCircle2,
  clock: Clock3,
  file: FileText,
  landmark: Landmark,
  messages: MessageSquareText,
  pen: PenLine,
  search: Search,
  users: UsersRound,
  video: Video,
  vote: Vote,
  wallet: WalletCards,
};

const TONE_STYLES: Record<
  LearnLessonTone,
  { background: string; border: string; foreground: string }
> = {
  amber: {
    background: "bg-[#fff8e8]",
    border: "border-[#ebcf86]",
    foreground: "text-[#7d5b00]",
  },
  coral: {
    background: "bg-[#fff1ed]",
    border: "border-[#efb6a8]",
    foreground: "text-[#944530]",
  },
  indigo: {
    background: "bg-[#f0f2ff]",
    border: "border-[#c5cbf3]",
    foreground: "text-[#4552a0]",
  },
  mint: {
    background: "bg-[#eef9f2]",
    border: "border-[#b8ddc5]",
    foreground: "text-[#24704a]",
  },
  rose: {
    background: "bg-[#fff1f5]",
    border: "border-[#ebbac9]",
    foreground: "text-[#9a405e]",
  },
  sky: {
    background: "bg-[#eef8fd]",
    border: "border-[#b9dced]",
    foreground: "text-[#176d96]",
  },
  teal: {
    background: "bg-[#edf9f8]",
    border: "border-[#aadbd6]",
    foreground: "text-[#1c716b]",
  },
  violet: {
    background: "bg-[#f6f1fb]",
    border: "border-[#d8c4e8]",
    foreground: "text-[#73508e]",
  },
};

interface LessonVisualProps {
  title: string;
  steps: readonly LearnLessonVisualStep[];
  tone: LearnLessonTone;
  size?: "card" | "hero";
}

export function LessonVisual({
  title,
  steps,
  tone,
  size = "card",
}: LessonVisualProps) {
  const styles = TONE_STYLES[tone];
  const isHero = size === "hero";
  const isDense = steps.length === 4;

  return (
    <div
      role="img"
      aria-label={`${title}の流れを示す図`}
      className={`flex items-center justify-center overflow-hidden border ${styles.background} ${styles.border} ${
        isHero ? "min-h-[220px] p-5 sm:min-h-[280px] sm:p-8" : "h-40 p-4"
      }`}
    >
      <div
        aria-hidden="true"
        className={`flex w-full max-w-2xl items-start justify-center ${
          isHero
            ? isDense
              ? "gap-1 sm:gap-4"
              : "gap-2 sm:gap-4"
            : isDense
              ? "gap-1"
              : "gap-1.5"
        }`}
      >
        {steps.map((step, index) => {
          const Icon = ICONS[step.icon];

          return (
            <div key={`${step.label}-${step.icon}`} className="contents">
              <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
                <span
                  className={`flex items-center justify-center rounded-lg border bg-white/90 ${styles.border} ${styles.foreground} ${
                    isHero
                      ? isDense
                        ? "size-10 sm:size-16"
                        : "size-12 sm:size-16"
                      : "size-10 sm:size-11"
                  }`}
                >
                  <Icon
                    className={
                      isHero
                        ? isDense
                          ? "size-5 sm:size-8"
                          : "size-6 sm:size-8"
                        : "size-5"
                    }
                    strokeWidth={1.8}
                  />
                </span>
                <span
                  className={`font-bold leading-tight ${styles.foreground} ${
                    isHero
                      ? isDense
                        ? "text-[11px] sm:text-sm"
                        : "text-xs sm:text-sm"
                      : "text-[11px]"
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 ? (
                <ArrowRight
                  className={`mt-3 shrink-0 ${styles.foreground} ${
                    isHero
                      ? isDense
                        ? "size-3 sm:mt-5 sm:size-5"
                        : "size-4 sm:mt-5 sm:size-5"
                      : isDense
                        ? "size-3 sm:mt-3.5"
                        : "size-3.5 sm:mt-3.5"
                  }`}
                  strokeWidth={2}
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
