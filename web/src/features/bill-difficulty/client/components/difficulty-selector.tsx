"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import type { CSSProperties } from "react";
import { useEffect, useId, useState, useTransition } from "react";
import { Switch } from "@/components/ui/switch";
import { setDifficultyLevel } from "../../server/actions/set-difficulty-level";
import type { DifficultyLevelEnum } from "../../shared/types";
import {
  saveScrollDistanceFromBottom,
  useRestoreScrollFromBottom,
} from "../hooks/use-scroll-from-bottom";

interface DifficultySelectorProps {
  currentLevel: DifficultyLevelEnum;
  label?: string;
  labelStyle?: CSSProperties;
  scrollToTop?: boolean;
  maintainScrollFromBottom?: boolean;
}

export function DifficultySelector({
  currentLevel,
  label,
  labelStyle,
  scrollToTop,
  maintainScrollFromBottom,
}: DifficultySelectorProps) {
  const router = useRouter();
  const [selectedLevel, setSelectedLevel] =
    useState<DifficultyLevelEnum>(currentLevel);
  const uniqueId = useId();
  const [isChanging, setIsChanging] = useState(false);
  const [isPending, startTransition] = useTransition();

  // ページロード時にスクロール位置を復元
  useRestoreScrollFromBottom(maintainScrollFromBottom ?? false, currentLevel);

  useEffect(() => {
    setSelectedLevel(currentLevel);
  }, [currentLevel]);

  const handleToggle = async (checked: boolean) => {
    const newLevel = checked ? "hard" : "normal";
    setIsChanging(true);
    setSelectedLevel(newLevel);

    try {
      await setDifficultyLevel(newLevel);

      if (scrollToTop) {
        // スクロール位置をトップに戻す
        window.scrollTo(0, 0);
      } else if (maintainScrollFromBottom) {
        // 画面下端からの距離を保存
        saveScrollDistanceFromBottom();
      }

      // URLから ?difficulty パラメータを削除
      const url = new URL(window.location.href);
      if (url.searchParams.get("difficulty") !== null) {
        url.searchParams.delete("difficulty");
        const nextUrl = `${url.pathname}${url.search}${url.hash}`;
        startTransition(() => {
          router.replace(nextUrl as Route, { scroll: false });
          router.refresh();
        });
        return;
      }

      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      console.error("Failed to update difficulty level:", error);
      // エラーの場合は元に戻す
      setSelectedLevel(currentLevel);
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-bold" style={labelStyle}>
        {label != null ? (
          label
        ) : (
          <span>
            <span className="hidden md:inline-block">説明をもっと</span>詳しく
          </span>
        )}
      </span>
      <Switch
        id={`${uniqueId}-difficulty-toggle`}
        checked={selectedLevel === "hard"}
        onCheckedChange={handleToggle}
        disabled={isChanging || isPending}
        aria-label="難易度を切り替え"
      />
    </div>
  );
}
