import { describe, expect, it } from "vitest";
import { routes } from "@/lib/routes";
import {
  getActivePrimaryNavigationItem,
  PRIMARY_NAVIGATION_ITEMS,
  shouldShowMobilePrimaryNavigation,
  shouldShowPrimaryNavigation,
} from "./primary-navigation";

describe("primary navigation", () => {
  it("keeps the required labels, order, and destinations in one definition", () => {
    expect(
      PRIMARY_NAVIGATION_ITEMS.map(({ label, href }) => ({ label, href }))
    ).toEqual([
      { label: "ホーム", href: routes.home() },
      { label: "議会", href: routes.bills() },
      { label: "議員", href: routes.councilors() },
      { label: "学ぶ", href: routes.learn() },
    ]);
  });

  it.each([
    ["/", "home"],
    ["/bills", "council"],
    ["/bills/bill-id", "council"],
    ["/bills/bill-id/topics/topic-id", "council"],
    ["/committees", "council"],
    ["/committees/committee-id", "council"],
    ["/kokkai/2026-session/bills", "council"],
    ["/councilors", "councilors"],
    ["/councilors/councilor-id", "councilors"],
    ["/learn", "learn"],
    ["/learn/glossary", "learn"],
  ])("selects the parent item for %s", (pathname, expectedItemId) => {
    expect(getActivePrimaryNavigationItem(pathname)?.id).toBe(expectedItemId);
  });

  it.each([
    "/terms",
    "/privacy",
    "/report-problem",
  ])("allows general pages without forcing an active item for %s", (pathname) => {
    expect(getActivePrimaryNavigationItem(pathname)).toBeNull();
    expect(shouldShowPrimaryNavigation(pathname)).toBe(true);
    expect(shouldShowMobilePrimaryNavigation(pathname)).toBe(true);
  });

  it.each([
    "/admin",
    "/admin/bills",
    "/auth/login",
    "/dev",
    "/preview/bills/bill-id",
    "/report/report-id",
    "/report/report-id/complete",
  ])("hides every primary navigation from special-purpose route %s", (pathname) => {
    expect(shouldShowPrimaryNavigation(pathname)).toBe(false);
    expect(shouldShowMobilePrimaryNavigation(pathname)).toBe(false);
  });

  it.each([
    "/bills/bill-id/interview",
    "/bills/bill-id/interview/disclosure",
    "/bills/bill-id/interview/chat",
  ])("shows only the mobile primary navigation on interview route %s", (pathname) => {
    expect(shouldShowPrimaryNavigation(pathname)).toBe(false);
    expect(shouldShowMobilePrimaryNavigation(pathname)).toBe(true);
  });
});
