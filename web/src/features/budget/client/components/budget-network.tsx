"use client";

import { useEffect, useState } from "react";
import {
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getBudgetNetworkLayout } from "../../shared/utils/budget-network-layout";

type BudgetNetworkProps = {
  onSelectTopic: (label: string) => void;
};

const topicToneClasses = {
  cyan: "border-budget-node-cyan bg-budget-node-cyan",
  mint: "border-budget-node-mint bg-budget-node-mint",
  gold: "border-budget-node-gold bg-budget-node-gold",
} as const;

export function BudgetNetwork({ onSelectTopic }: BudgetNetworkProps) {
  const mode = useBudgetNetworkMode();
  const { topics, decorations, edges } = getBudgetNetworkLayout(mode);
  const decorationPoints = decorations.map((decoration) => ({
    id: decoration.id,
    x: decoration.x,
    y: 100 - decoration.y,
    size: decoration.size,
  }));

  return (
    <div
      role="group"
      className="absolute inset-0"
      aria-label="予算を10の分野から探すネットワーク"
    >
      <div aria-hidden="true" className="absolute inset-0">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <XAxis
              type="number"
              dataKey="x"
              domain={[0, 100]}
              hide
              allowDataOverflow
            />
            <YAxis
              type="number"
              dataKey="y"
              domain={[0, 100]}
              hide
              allowDataOverflow
            />
            <ZAxis type="number" dataKey="size" range={[22, 120]} />
            {edges.map((edge) => (
              <ReferenceLine
                key={edge.id}
                segment={[
                  { x: edge.source.x, y: 100 - edge.source.y },
                  { x: edge.target.x, y: 100 - edge.target.y },
                ]}
                stroke="var(--budget-space-line)"
                strokeOpacity={edge.strength === "primary" ? 0.48 : 0.24}
                strokeWidth={edge.strength === "primary" ? 1.5 : 1}
                ifOverflow="visible"
              />
            ))}
            <Scatter
              data={decorationPoints}
              fill="var(--budget-node-cyan)"
              fillOpacity={0.68}
              isAnimationActive={false}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <div className="absolute inset-0">
        {topics.map((topic) => (
          <Button
            key={topic.id}
            type="button"
            variant="ghost"
            onClick={() => onSelectTopic(topic.label)}
            style={{ left: `${topic.x}%`, top: `${topic.y}%` }}
            className="budget-network-topic absolute h-16 w-24 -translate-x-1/2 -translate-y-1/2 flex-col gap-1 p-0 text-white hover:bg-transparent hover:text-white focus-visible:ring-budget-node-cyan focus-visible:ring-offset-budget-space-deep sm:w-28"
            aria-label={`${topic.label}の予算を探す`}
          >
            <span
              aria-hidden="true"
              className={cn(
                "budget-network-topic-core block size-8 rounded-full border-4 shadow-lg",
                topicToneClasses[topic.tone]
              )}
            />
            <span className="budget-network-topic-label text-xs font-bold sm:text-sm">
              {topic.label}
            </span>
          </Button>
        ))}
      </div>
    </div>
  );
}

function useBudgetNetworkMode(): "mobile" | "desktop" {
  const [mode, setMode] = useState<"mobile" | "desktop">(() => {
    if (typeof window === "undefined") {
      return "mobile";
    }
    return window.matchMedia("(min-width: 500px)").matches
      ? "desktop"
      : "mobile";
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 500px)");
    const updateMode = () => {
      setMode(mediaQuery.matches ? "desktop" : "mobile");
    };
    updateMode();
    mediaQuery.addEventListener("change", updateMode);
    return () => mediaQuery.removeEventListener("change", updateMode);
  }, []);

  return mode;
}
