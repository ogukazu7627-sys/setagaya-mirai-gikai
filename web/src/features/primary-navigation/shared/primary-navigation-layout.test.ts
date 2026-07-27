import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("primary navigation layout styles", () => {
  const globals = fs.readFileSync(
    path.resolve(__dirname, "../../../app/globals.css"),
    "utf8"
  );

  it("uses a shared mobile height and iPhone safe-area padding", () => {
    expect(globals).toContain("--mobile-primary-navigation-height: 3.75rem");
    expect(globals).toContain(
      "padding-bottom: env(safe-area-inset-bottom, 0px)"
    );
    expect(globals).toContain("padding-right: env(safe-area-inset-right, 0px)");
    expect(globals).toContain("padding-left: env(safe-area-inset-left, 0px)");
    expect(globals).toContain("--mobile-primary-navigation-layout-offset");
  });

  it("reserves only the iPhone top safe area when the header is hidden", () => {
    expect(globals).toContain("@media (max-width: 767px)");
    expect(globals).toContain(
      "--app-header-layout-offset: var(--app-header-safe-top)"
    );
  });

  it("reserves bottom space only below the existing pc breakpoint", () => {
    expect(globals).toContain(".layout-with-mobile-primary-navigation {");
    expect(globals).toContain("@media (min-width: 1000px)");
    expect(globals).toContain("padding-bottom: 0");
  });

  it("uses a readable accent for active labels and focus indicators", () => {
    expect(globals).toContain("--primary-strong: #0369a1");
    expect(globals).toContain("--color-primary-strong: var(--primary-strong)");
  });
});
