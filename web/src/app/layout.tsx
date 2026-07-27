import "@fontsource-variable/lexend-giga/wght.css";
import "@fontsource-variable/noto-sans-jp/wght.css";
import "@fontsource-variable/noto-serif-jp/wght.css";
import "./globals.css";
import type { Metadata, Viewport } from "next";
import NextTopLoader from "nextjs-toploader";
import type { ReactNode } from "react";
import { env } from "@/lib/env";

const siteTitle = "みらい議会＠世田谷区";
const siteDescription =
  "世田谷区議会の議案や質問を、公式資料に戻れる形でわかりやすく確認するための情報整理サイト";
const siteName = "みらい議会＠世田谷区";
const pwaName = "議会＠世田谷";
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
  applicationName: pwaName,
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
      { url: "/icons/pwa/icon_android_192_v2.png", sizes: "192x192" },
    ],
    apple: "/icons/pwa/icon_ios_v2.png",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    title: pwaName,
  },
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
  viewportFit: "cover",
  themeColor,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="font-sans antialiased bg-mirai-surface-light">
        <NextTopLoader showSpinner={false} color={themeColor} />
        {children}
      </body>
    </html>
  );
}
