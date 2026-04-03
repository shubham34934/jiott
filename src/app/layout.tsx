import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { BottomNav } from "@/components/BottomNav";
// import { Footer } from "@/components/Footer";
import { QueryProvider } from "@/providers/QueryProvider";
import { AuthProvider } from "@/providers/AuthProvider";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "JioTT - Table Tennis Tracker",
  description: "Track table tennis matches, players, ratings, and tournaments",
  manifest: "/manifest.json",
  applicationName: "JioTT",
  verification: {
    google: "FyWsFQdkWVWKyOi_Mjqnp2kbZmFNjzNTS9rR13V2ryk",
  },
  keywords: ["table tennis", "ping pong", "match tracker", "leaderboard"],
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "JioTT",
  },
  openGraph: {
    title: "JioTT - Table Tennis Tracker",
    description: "Track table tennis matches, players, ratings, and tournaments",
    url: "https://jiott-eight.vercel.app",
    siteName: "JioTT",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#1D4ED8",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.className}>
      <body className="min-h-dvh bg-background">
        <AuthProvider>
          <QueryProvider>
            <main className="pb-20 max-w-lg mx-auto">
              {children}
              {/* <Footer /> */}
            </main>
            <BottomNav />
            <ServiceWorkerRegister />
          </QueryProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
