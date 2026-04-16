import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import Image from "next/image";
import { NavTabs } from "@/components/nav-tabs";
import { ServiceWorkerRegister } from "@/components/sw-register";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EXIT Toys Indexing Dashboard",
  description: "Monitor de Google indexeringsstatus van alle EXIT Toys webshops",
  applicationName: "EXIT Indexing",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "EXIT Indexing",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: "/favicon.png",
    apple: "/apple-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1A2E05",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="nl"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background font-sans">
        <header className="bg-exit-header sticky top-0 z-30 pt-[env(safe-area-inset-top)]">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6 sm:py-3">
            <Link
              href="/"
              className="flex items-center gap-3 min-w-0"
            >
              <Image
                src="/exit-logo.svg"
                alt="EXIT Toys"
                width={70}
                height={52}
                className="h-9 w-auto sm:h-[42px] shrink-0"
                priority
              />
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-semibold text-white truncate">
                  Indexing Dashboard
                </h1>
                <p className="text-[11px] sm:text-xs text-white/50 truncate">
                  Google Search Console
                </p>
              </div>
            </Link>
            <NavTabs />
          </div>
        </header>
        <main
          className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-8"
          style={{
            paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))",
          }}
        >
          {children}
        </main>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
