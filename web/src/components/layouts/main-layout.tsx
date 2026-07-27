"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { shouldShowMobilePrimaryNavigation } from "@/features/primary-navigation/shared/primary-navigation";
import {
  hasPersistentChatSidebar,
  isInterviewSection,
  isWidePage,
} from "@/lib/page-layout-utils";
import { cn } from "@/lib/utils";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const pathname = usePathname();
  const useSidebarLayout = hasPersistentChatSidebar(pathname);
  const useWideLayout = isWidePage(pathname);
  const isInterview = isInterviewSection(pathname);
  const showMobilePrimaryNavigation =
    shouldShowMobilePrimaryNavigation(pathname);

  return (
    <div
      className={cn(
        // モバイルはsafe areaのみ、768px以上は固定ヘッダーの実測高を確保する。
        "relative mx-auto pt-[var(--app-header-layout-offset)] min-[768px]:mt-[var(--app-header-layout-offset)] min-[768px]:pt-0",
        useWideLayout ? "max-w-[1180px]" : "max-w-[700px]",
        // インタビューページ以外ではshadowを表示
        !isInterview && "sm:shadow-lg",
        // TOPと案件詳細は、1000px帯でもチャットを含めて横幅内に収める。
        useSidebarLayout &&
          "pc:mr-[500px] pc:w-[calc(100vw-500px-2rem)] xl:ml-[calc(calc(100vw-1180px)/2)] xl:w-[700px]",
        // モバイル固定ナビが本文と通常フッターの末尾を覆わない共通余白。
        showMobilePrimaryNavigation && "layout-with-mobile-primary-navigation"
      )}
    >
      {children}
    </div>
  );
}
