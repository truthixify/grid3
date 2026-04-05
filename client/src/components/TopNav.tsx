"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import WalletButton from "./WalletButton";

const NAV_LINKS = [
  { label: "LOBBY", href: "/" },
  { label: "LEADERBOARD", href: "/leaderboard" },
  { label: "HISTORY", href: "/history" },
];

export default function TopNav() {
  const pathname = usePathname();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-surface-container-low ghost-border flex items-center px-4 md:px-6">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 mr-8">
        <img src="/logo.svg" alt="GRID3" width={24} height={24} />
        <span className="font-headline font-bold italic text-on-surface text-base tracking-tight">
          GRID3
        </span>
      </Link>

      {/* Nav links - hidden on mobile */}
      <nav className="hidden md:flex items-center gap-6">
        {NAV_LINKS.map((link) => {
          const isActive =
            link.href === "/"
              ? pathname === "/"
              : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`relative text-xs font-headline font-semibold tracking-widest pb-1 transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {link.label}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Wallet */}
      <WalletButton />
    </header>
  );
}
