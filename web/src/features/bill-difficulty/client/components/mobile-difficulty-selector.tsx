"use client";

import { cn } from "@/lib/utils";
import type { DifficultyLevelEnum } from "../../shared/types";
import { DifficultySelector } from "./difficulty-selector";

interface MobileDifficultySelectorProps {
  currentLevel: DifficultyLevelEnum;
  className?: string;
}

export function MobileDifficultySelector({
  currentLevel,
  className,
}: MobileDifficultySelectorProps) {
  return (
    <div
      className={cn(
        "flex w-fit shrink-0 items-center rounded-lg border border-mirai-border bg-white px-3 py-2 min-[768px]:hidden",
        className
      )}
    >
      <DifficultySelector currentLevel={currentLevel} label="詳しく" />
    </div>
  );
}
