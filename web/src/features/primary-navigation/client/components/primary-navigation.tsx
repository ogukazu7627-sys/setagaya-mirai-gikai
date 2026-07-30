import type { Route } from "next";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  getActivePrimaryNavigationItem,
  PRIMARY_NAVIGATION_ITEMS,
} from "../../shared/primary-navigation";

type PrimaryNavigationProps = {
  pathname: string;
  variant: "desktop" | "mobile";
};

export function PrimaryNavigation({
  pathname,
  variant,
}: PrimaryNavigationProps) {
  const activeItem = getActivePrimaryNavigationItem(pathname);
  const isDesktop = variant === "desktop";

  return (
    <nav
      aria-label="主要ナビゲーション"
      data-primary-navigation={variant}
      className="w-full"
    >
      <ul
        className={cn(
          isDesktop
            ? "flex items-stretch justify-center gap-1"
            : "grid h-[var(--mobile-primary-navigation-height)] grid-cols-5"
        )}
      >
        {PRIMARY_NAVIGATION_ITEMS.map((item) => {
          const isActive = activeItem?.id === item.id;
          const Icon = item.icon;

          return (
            <li key={item.id} className={isDesktop ? undefined : "min-w-0"}>
              <Link
                href={item.href as Route}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative flex min-h-11 items-center justify-center whitespace-nowrap font-bold motion-safe:transition-colors motion-safe:duration-150",
                  "focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong",
                  isDesktop
                    ? "h-16 gap-2 border-b-2 px-3 text-sm"
                    : "h-full min-w-0 flex-col gap-0.5 border-t-2 px-1 text-xs",
                  isActive
                    ? "border-primary-strong text-primary-strong"
                    : "border-transparent text-mirai-text hover:text-primary-strong"
                )}
              >
                <Icon
                  aria-hidden="true"
                  className="size-5 shrink-0"
                  strokeWidth={isActive ? 2.25 : 2}
                />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
