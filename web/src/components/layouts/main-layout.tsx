"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { shouldShowPrimaryNavigation } from "@/features/primary-navigation/shared/primary-navigation";
import { isInterviewSection, isMainPage } from "@/lib/page-layout-utils";
import { cn } from "@/lib/utils";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const pathname = usePathname();
  const useSidebarLayout = isMainPage(pathname);
  const isInterview = isInterviewSection(pathname);
  const showPrimaryNavigation = shouldShowPrimaryNavigation(pathname);

  return (
    <div
      className={cn(
        // 固定ヘッダーの実測高とsafe areaを、全ページ共通の先頭余白に反映する。
        "relative max-w-[700px] mx-auto pt-[var(--app-header-layout-offset)] md:pt-0 md:mt-[var(--app-header-layout-offset)]",
        // インタビューページ以外ではshadowを表示
        !isInterview && "sm:shadow-lg",
        // TOPと案件詳細は、1000px帯でもチャットを含めて横幅内に収める。
        useSidebarLayout &&
          "pc:mr-[500px] pc:w-[calc(100vw-500px-2rem)] xl:ml-[calc(calc(100vw-1180px)/2)] xl:w-[700px]",
        // モバイル固定ナビが本文と通常フッターの末尾を覆わない共通余白。
        showPrimaryNavigation && "layout-with-mobile-primary-navigation"
      )}
    >
      {children}
    </div>
  );
}
