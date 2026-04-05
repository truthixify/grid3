"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const MOBILE_LINKS = [
  { label: "BATTLE", href: "/", icon: "swords", useActiveGame: true },
  { label: "BOARD", href: "/leaderboard", icon: "leaderboard", useActiveGame: false },
  { label: "HISTORY", href: "/history", icon: "history", useActiveGame: false },
];

export default function MobileNav() {
  const pathname = usePathname();

  function getHref(link: typeof MOBILE_LINKS[number]): string {
    if (link.useActiveGame) {
      const activeGameId =
        typeof window !== "undefined"
          ? sessionStorage.getItem("activeGameId")
          : null;
      if (activeGameId) {
        return `/game/${encodeURIComponent(activeGameId)}`;
      }
    }
    return link.href;
  }

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 h-14 bg-surface-container-low ghost-border flex items-center justify-around">
      {MOBILE_LINKS.map((link) => {
        const isActive =
          link.href === "/"
            ? pathname === "/" || pathname.startsWith("/game")
            : pathname.startsWith(link.href);
        const href = getHref(link);
        return (
          <Link
            key={link.label}
            href={href}
            className={`flex flex-col items-center gap-0.5 text-[10px] font-headline font-semibold tracking-wider transition-colors ${
              isActive
                ? "text-primary"
                : "text-on-surface-variant"
            }`}
          >
            <span className="material-symbols-outlined text-xl">
              {link.icon}
            </span>
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
