// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DEFAULT_COUNCILOR_ICON_URL } from "@/lib/markdown/councilor-icon-config";
import { CouncilorAvatarImage } from "./councilor-avatar-image";

describe("CouncilorAvatarImage", () => {
  it("loads councilor avatars without Next image optimization", () => {
    render(
      <CouncilorAvatarImage
        alt="加藤たいき議員"
        className="rounded-full"
        size={44}
        src="/icons/councilors/kato-taiki-avatar.jpg"
      />
    );

    const image = screen.getByAltText("加藤たいき議員");

    expect(image.getAttribute("src")).toContain(
      "/icons/councilors/kato-taiki-avatar.jpg"
    );
    expect(image).toHaveAttribute("loading", "lazy");
    expect(image).toHaveAttribute("width", "44");
    expect(image).toHaveAttribute("height", "44");
  });

  it("can eagerly load visible avatars", () => {
    render(
      <CouncilorAvatarImage
        alt="現在表示中の議員"
        loading="eager"
        size={32}
        src="/icons/councilors/oruzuguru-avatar.jpg"
      />
    );

    expect(screen.getByAltText("現在表示中の議員")).toHaveAttribute(
      "loading",
      "eager"
    );
  });

  it("falls back to the default icon when the avatar fails to load", async () => {
    render(
      <CouncilorAvatarImage
        alt="オルズグル議員"
        size={44}
        src="/icons/councilors/missing-avatar.jpg"
      />
    );

    fireEvent.error(screen.getByAltText("オルズグル議員"));

    await waitFor(() => {
      expect(
        screen.getByAltText("オルズグル議員").getAttribute("src")
      ).toContain(DEFAULT_COUNCILOR_ICON_URL);
    });
  });

  it("resets the image source when the councilor changes", async () => {
    const { rerender } = render(
      <CouncilorAvatarImage
        alt="議員"
        size={44}
        src="/icons/councilors/missing-avatar.jpg"
      />
    );

    fireEvent.error(screen.getByAltText("議員"));
    await waitFor(() => {
      expect(screen.getByAltText("議員").getAttribute("src")).toContain(
        DEFAULT_COUNCILOR_ICON_URL
      );
    });

    rerender(
      <CouncilorAvatarImage
        alt="議員"
        size={44}
        src="/icons/councilors/oruzuguru-avatar.jpg"
      />
    );

    await waitFor(() => {
      expect(screen.getByAltText("議員").getAttribute("src")).toContain(
        "/icons/councilors/oruzuguru-avatar.jpg"
      );
    });
  });
});
