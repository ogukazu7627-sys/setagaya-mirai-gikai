"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { isInterviewSection, isMainPage } from "@/lib/page-layout-utils";
import { cn } from "@/lib/utils";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const pathname = usePathname();
  const useSidebarLayout = isMainPage(pathname);
  const isInterview = isInterviewSection(pathname);

  return (
    <div
      className={cn(
        // 固定ヘッダーの実測高とsafe areaを、全ページ共通の先頭余白に反映する。
        "relative max-w-[700px] mx-auto pt-[var(--app-header-layout-offset)] md:pt-0 md:mt-[var(--app-header-layout-offset)]",
        // インタビューページ以外ではshadowを表示
        !isInterview && "sm:shadow-lg",
        // TOPページと案件詳細ページのみ、チャットサイドバー用のオフセット
        useSidebarLayout && "pc:mr-[500px] xl:ml-[calc(calc(100vw-1180px)/2)]"
      )}
    >
      {children}
    </div>
  );
}
