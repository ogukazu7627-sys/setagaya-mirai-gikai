import { EXTERNAL_LINKS } from "@/config/external-links";
import { routes } from "@/lib/routes";

export type FooterLink = {
  label: string;
  href: string;
  external?: boolean;
};

export type FooterPolicyLink = {
  label: string;
  href: string;
  external?: boolean;
};

export const primaryLinks: FooterLink[] = [
  {
    label: "TOP",
    href: routes.home(),
  },
  {
    label: "元になったみらい議会",
    href: EXTERNAL_LINKS.ORIGINAL_MIRAI_GIKAI,
    external: true,
  },
  {
    label: "世田谷区議会公式",
    href: EXTERNAL_LINKS.SETAGAYA_COUNCIL,
    external: true,
  },
  {
    label: "公式議案一覧",
    href: EXTERNAL_LINKS.SETAGAYA_BILLS,
    external: true,
  },
];

export const policyLinks: FooterPolicyLink[] = [
  {
    label: "利用規約",
    href: routes.terms(),
  },
  {
    label: "プライバシーポリシー",
    href: routes.privacy(),
  },
];
