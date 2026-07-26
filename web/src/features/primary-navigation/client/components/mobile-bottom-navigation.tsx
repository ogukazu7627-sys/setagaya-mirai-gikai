"use client";

import { usePathname } from "next/navigation";
import { shouldShowPrimaryNavigation } from "../../shared/primary-navigation";
import { useMobileNavigationKeyboard } from "../hooks/use-mobile-navigation-keyboard";
import { PrimaryNavigation } from "./primary-navigation";

export function MobileBottomNavigation() {
  const pathname = usePathname();
  const isKeyboardOpen = useMobileNavigationKeyboard();

  if (!shouldShowPrimaryNavigation(pathname) || isKeyboardOpen) {
    return null;
  }

  return (
    <div className="app-mobile-primary-navigation fixed inset-x-0 bottom-0 z-30 border-t border-mirai-border bg-white shadow-[0_-4px_16px_rgb(0_0_0/0.06)] pc:hidden">
      <PrimaryNavigation pathname={pathname} variant="mobile" />
    </div>
  );
}
