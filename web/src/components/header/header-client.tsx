"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { DifficultySelector } from "@/features/bill-difficulty/client/components/difficulty-selector";
import type { DifficultyLevelEnum } from "@/features/bill-difficulty/shared/types";
import { InterviewHeaderActions } from "@/features/interview-session/client/components/interview-header-actions";
import { DesktopHeaderNavigation } from "@/features/primary-navigation/client/components/desktop-header-navigation";
import { shouldShowPrimaryNavigation } from "@/features/primary-navigation/shared/primary-navigation";
import { isInterviewPage, isMainPage } from "@/lib/page-layout-utils";
import { routes } from "@/lib/routes";
import { HamburgerMenu } from "./hamburger-menu";

interface HeaderClientProps {
  difficultyLevel: DifficultyLevelEnum;
}

export function HeaderClient({ difficultyLevel }: HeaderClientProps) {
  const pathname = usePathname();
  const showDifficultySelector = isMainPage(pathname);
  const showInterviewActions = isInterviewPage(pathname);
  const showPrimaryNavigation = shouldShowPrimaryNavigation(pathname);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const headerElement = headerRef.current;
    if (!headerElement) {
      return;
    }

    const updateHeaderHeight = () => {
      const height = headerElement.getBoundingClientRect().height;
      if (height > 0) {
        document.documentElement.style.setProperty(
          "--app-header-height",
          `${height}px`
        );
      }
    };

    updateHeaderHeight();
    if (typeof ResizeObserver === "undefined") {
      return () => {
        document.documentElement.style.removeProperty("--app-header-height");
      };
    }

    const observer = new ResizeObserver(updateHeaderHeight);
    observer.observe(headerElement);

    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty("--app-header-height");
    };
  }, []);

  return (
    <header
      ref={headerRef}
      className="app-fixed-header fixed left-0 right-0 z-40 mx-auto max-w-[1240px]"
    >
      <div className="mx-auto max-w-[1180px] rounded-2xl bg-white px-3 shadow-sm min-[360px]:px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center gap-2 pc:gap-5">
          {/* Logo / Site Title */}
          <div className="flex shrink-0 items-center">
            <Link
              href={routes.home()}
              className="flex items-center space-x-2"
              aria-label="ホーム"
            >
              <Image
                src="/img/brand-logo.png"
                alt="みらい議会＠世田谷区"
                width={207}
                height={60}
                className="h-8 w-auto min-[360px]:h-9 sm:h-11"
                priority
              />
            </Link>
          </div>

          {showPrimaryNavigation && (
            <DesktopHeaderNavigation pathname={pathname} />
          )}

          {/* Auxiliary navigation */}
          <nav
            className="ml-auto flex shrink-0 items-center space-x-2"
            aria-label="補助ナビゲーション"
          >
            {showDifficultySelector && (
              <DifficultySelector currentLevel={difficultyLevel} />
            )}
            {showInterviewActions && <InterviewHeaderActions />}
            <HamburgerMenu />
          </nav>
        </div>
      </div>
    </header>
  );
}
