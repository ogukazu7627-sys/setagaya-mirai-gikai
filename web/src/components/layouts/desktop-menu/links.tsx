import type { Route } from "next";
import Link from "next/link";
import { EXTERNAL_LINKS } from "@/config/external-links";
import { routes } from "@/lib/routes";

type FooterLinkItem = {
  label: string;
  href: string;
  external?: boolean;
};

const links: FooterLinkItem[] = [
  {
    label: "世田谷区議会公式",
    href: EXTERNAL_LINKS.SETAGAYA_COUNCIL,
    external: true,
  },
  {
    label: "利用規約",
    href: routes.terms(),
    external: false,
  },
  {
    label: "プライバシーポリシー",
    href: routes.privacy(),
    external: false,
  },
  {
    label: "本家みらい議会",
    href: EXTERNAL_LINKS.ORIGINAL_MIRAI_GIKAI,
    external: true,
  },
];

/**
 * デスクトップメニュー: フッターリンク（サイドバー内）
 */
export function DesktopMenuLinks() {
  return (
    <div className="flex flex-col gap-1.5">
      {links.map((link) => (
        <Link
          key={link.label}
          href={link.href as Route}
          target={link.external ? "_blank" : undefined}
          rel={link.external ? "noreferrer" : undefined}
          className="font-medium text-xs transition-opacity hover:opacity-70"
          style={{
            lineHeight: "1.48em",
          }}
        >
          {link.label}
        </Link>
      ))}
      <p
        className="font-medium text-xs"
        style={{
          lineHeight: "1.48em",
        }}
      >
        みらい議会＠世田谷区 Fork MVP
      </p>
    </div>
  );
}
