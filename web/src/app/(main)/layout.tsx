import { GoogleAnalytics } from "@next/third-parties/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { type ReactNode, Suspense } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/layouts/footer/footer";
import { MainLayout } from "@/components/layouts/main-layout";
import { MobileBottomNavigation } from "@/features/primary-navigation/client/components/mobile-bottom-navigation";
import { PublicViewStateTracker } from "@/features/public-view-state/client/components/public-view-state-tracker";
import { env } from "@/lib/env";
import { RubyfulInitializer } from "@/lib/rubyful";

export default function MainGroupLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <>
      <SpeedInsights />
      <GoogleAnalytics gaId={env.analytics.gaTrackingId ?? ""} />
      <RubyfulInitializer />
      <Suspense fallback={null}>
        <PublicViewStateTracker />
      </Suspense>

      <MainLayout>
        <Header />
        <main className="min-h-dvh bg-mirai-surface min-[768px]:min-h-[calc(100dvh-96px)]">
          {children}
        </main>
        <Footer />
      </MainLayout>
      <MobileBottomNavigation />
    </>
  );
}
