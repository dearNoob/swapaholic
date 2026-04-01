import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import MainLayout from "../components/layout/MainLayout";
import OutbidNotificationManager from "../components/bidding/OutbidNotification";
import BackToTop from "../components/ui/BackToTop";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Swapaholic - Buy & Sell Second-Hand Items with Confidence",
  description: "Discover the safest marketplace for second-hand products. Buy, sell, and trade with secure escrow payments, real-time bidding, and quality verification.",
  keywords: ["marketplace", "second-hand", "auction", "bidding", "sell items", "buy used"],
  openGraph: {
    title: "Swapaholic Marketplace",
    description: "The safest marketplace for second-hand products with secure escrow.",
    url: "https://swapaholic.com",
    siteName: "Swapaholic",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Swapaholic Marketplace",
    description: "Discover the safest marketplace for second-hand products.",
  },
};

import AuthInitializer from "../components/auth/AuthInitializer";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className={`${inter.variable} ${inter.className}`} suppressHydrationWarning>
        <Providers>
          <AuthInitializer>
            <MainLayout>
              {children}
            </MainLayout>
          </AuthInitializer>
          <OutbidNotificationManager />
          <BackToTop />
        </Providers>
      </body>
    </html>
  );
}

