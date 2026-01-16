import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import MainLayout from "../components/layout/MainLayout";
import OutbidNotificationManager from "../components/bidding/OutbidNotification";

export const metadata: Metadata = {
  title: "Swapaholic - Buy & Sell Second-Hand Items with Confidence",
  description: "Discover the safest marketplace for second-hand products. Buy, sell, and trade with secure escrow payments, real-time bidding, and quality verification.",
};

import AuthInitializer from "../components/auth/AuthInitializer";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body suppressHydrationWarning>
        <Providers>
          <AuthInitializer>
            <MainLayout>
              {children}
            </MainLayout>
          </AuthInitializer>
          <OutbidNotificationManager />
        </Providers>
      </body>
    </html>
  );
}
