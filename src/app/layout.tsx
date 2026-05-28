import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import Image from "next/image";
import { NavTabs } from "@/components/nav-tabs";
import { ServiceWorkerRegister } from "@/components/sw-register";
import { ThemeToggle, ThemeInitScript } from "@/components/theme-toggle";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME || "Indexing Dashboard";
const BRAND_SHORT = process.env.NEXT_PUBLIC_BRAND_SHORT || BRAND_NAME;

export const metadata: Metadata = {
  title: `${BRAND_NAME} — Indexing Dashboard`,
  description: `Monitor de Google indexeringsstatus van alle webshops van ${BRAND_NAME}.`,
  applicationName: `${BRAND_SHORT} Indexing`,
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: `${BRAND_SHORT} Indexing`,
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.png", type: "image/png", sizes: "192x192" },
    ],
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
      <head>
        <ThemeInitScript />
      </head>
      <body className="min-h-full bg-background font-sans">
        <header className="bg-brand-header sticky top-0 z-30 pt-[env(safe-area-inset-top)]">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6 sm:py-3">
            <Link
              href="/"
              className="flex items-center gap-3 min-w-0"
            >
              <Image
                src="/logo.svg"
                alt={BRAND_NAME}
                width={70}
                height={52}
                className="h-9 w-auto sm:h-[42px] shrink-0"
                priority
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-semibold text-white truncate">
                    Indexing Dashboard
                  </h1>
                  <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-white/70">
                    v1
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-white/50 truncate">
                  Google Search Console
                </p>
              </div>
            </Link>
            <div className="flex items-center gap-2">
              <NavTabs />
              <ThemeToggle />
            </div>
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
