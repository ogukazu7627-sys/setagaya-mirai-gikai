import {
  BookOpen,
  House,
  Landmark,
  type LucideIcon,
  UsersRound,
} from "lucide-react";
import { routes } from "@/lib/routes";

export type PrimaryNavigationItemId =
  | "home"
  | "council"
  | "councilors"
  | "learn";

export type PrimaryNavigationItem = {
  id: PrimaryNavigationItemId;
  label: "ホーム" | "議会" | "議員" | "学ぶ";
  href: string;
  icon: LucideIcon;
  matches: (pathname: string) => boolean;
};

function isPathWithin(pathname: string, parentPath: string): boolean {
  return pathname === parentPath || pathname.startsWith(`${parentPath}/`);
}

function isCouncilPath(pathname: string): boolean {
  return (
    isPathWithin(pathname, routes.bills()) ||
    isPathWithin(pathname, routes.committees()) ||
    isPathWithin(pathname, "/kokkai")
  );
}

export const PRIMARY_NAVIGATION_ITEMS: readonly PrimaryNavigationItem[] = [
  {
    id: "home",
    label: "ホーム",
    href: routes.home(),
    icon: House,
    matches: (pathname) => pathname === routes.home(),
  },
  {
    id: "council",
    label: "議会",
    href: routes.bills(),
    icon: Landmark,
    matches: isCouncilPath,
  },
  {
    id: "councilors",
    label: "議員",
    href: routes.councilors(),
    icon: UsersRound,
    matches: (pathname) => isPathWithin(pathname, routes.councilors()),
  },
  {
    id: "learn",
    label: "学ぶ",
    href: routes.learn(),
    icon: BookOpen,
    matches: (pathname) => isPathWithin(pathname, routes.learn()),
  },
];

const PRIMARY_NAVIGATION_HIDDEN_PATHS = [
  "/admin",
  "/auth",
  "/dev",
  "/preview",
  "/report",
] as const;

export const PRIMARY_NAVIGATION_DESKTOP_MIN_WIDTH = 1000;

export function getActivePrimaryNavigationItem(
  pathname: string
): PrimaryNavigationItem | null {
  return (
    PRIMARY_NAVIGATION_ITEMS.find((item) => item.matches(pathname)) ?? null
  );
}

export function shouldShowPrimaryNavigation(pathname: string): boolean {
  if (
    PRIMARY_NAVIGATION_HIDDEN_PATHS.some((path) => isPathWithin(pathname, path))
  ) {
    return false;
  }

  return !/^\/bills\/[^/]+\/interview(?:\/|$)/u.test(pathname);
}

export function shouldShowMobilePrimaryNavigation(pathname: string): boolean {
  return !PRIMARY_NAVIGATION_HIDDEN_PATHS.some((path) =>
    isPathWithin(pathname, path)
  );
}
