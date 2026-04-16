"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", label: "Dashboard" },
  { href: "/uitleg", label: "Uitleg" },
  { href: "/instellingen", label: "Instellingen" },
];

export function NavTabs() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1">
      {tabs.map((tab) => {
        const isActive =
          tab.href === "/"
            ? pathname === "/" || pathname.startsWith("/shop")
            : pathname === tab.href;

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-200 ${
              isActive
                ? "bg-white/15 text-white"
                : "text-white/60 hover:text-white hover:bg-white/10"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
