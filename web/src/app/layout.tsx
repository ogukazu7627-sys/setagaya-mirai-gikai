import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Lexend_Giga, Noto_Sans_JP, Noto_Serif_JP } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import type { ReactNode } from "react";
import { env } from "@/lib/env";

const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const lexendGiga = Lexend_Giga({
  variable: "--font-lexend-giga",
  subsets: ["latin"],
  weight: ["400", "500", "700", "800", "900"],
});

// トピックの代表意見など、引用文を明朝体で表示するために使用
const notoSerifJP = Noto_Serif_JP({
  variable: "--font-noto-serif-jp",
  subsets: ["latin"],
  weight: ["500", "600"],
});

const siteTitle = "みらい議会＠世田谷区";
const siteDescription =
  "世田谷区議会の議案や質問を、公式資料に戻れる形でわかりやすく確認するための非公式サイト";
const siteName = "みらい議会＠世田谷区";
const themeColor = "#38bdf8";
const ogImage = {
  url: "/ogp.jpg",
  width: 1200,
  height: 630,
  alt: "みらい議会＠世田谷区のOGPイメージ",
};

export const metadata: Metadata = {
  metadataBase: new URL(env.webUrl),
  title: siteTitle,
  description: siteDescription,
  keywords: [
    siteName,
    "世田谷区議会",
    "議案",
    "区議会",
    "条例",
    "政策",
    "解説",
  ],
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icons/pwa/icon_android_192.png", sizes: "192x192" },
    ],
    apple: "/icons/pwa/icon_ios.png",
  },
  manifest: "/manifest.json",
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    images: [ogImage],
    siteName,
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: [ogImage.url],
  },
  verification: {
    google: "hK_0xS4nS3d8J-yTeVT1b12Y8zIer6r_yEurc_RJ300",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${notoSansJP.variable} ${lexendGiga.variable} ${notoSerifJP.variable} font-sans antialiased bg-mirai-surface-light`}
      >
        <NextTopLoader showSpinner={false} color={themeColor} />
        {children}
      </body>
    </html>
  );
}
