"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SIDE_LINKS = [
  { label: "BATTLE", href: "/", icon: "swords", useActiveGame: true },
  { label: "LEADERBOARD", href: "/leaderboard", icon: "leaderboard", useActiveGame: false },
  { label: "HISTORY", href: "/history", icon: "history", useActiveGame: false },
];

export default function SideNav() {
  const pathname = usePathname();

  function getHref(link: typeof SIDE_LINKS[number]): string {
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
    <aside className="hidden lg:flex flex-col w-56 fixed top-14 left-0 bottom-0 bg-surface-container-low ghost-border z-40">
      {/* Operator info card */}
      <div className="p-4 ghost-border mx-3 mt-4 rounded-sm">
        <div className="flex items-center gap-2 mb-2">
          <span className="material-symbols-outlined text-primary text-base">
            terminal
          </span>
          <span className="text-xs font-headline font-semibold text-on-surface-variant tracking-widest">
            OPERATOR
          </span>
        </div>
        <p className="text-[10px] text-on-surface-variant font-body">
          CKB Testnet
        </p>
        <div className="flex items-center gap-1 mt-1">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          <span className="text-[10px] text-primary font-body">CONNECTED</span>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex flex-col mt-6 px-3 gap-1 flex-1">
        {SIDE_LINKS.map((link) => {
          const isActive =
            link.href === "/"
              ? pathname === "/" || pathname.startsWith("/game")
              : pathname.startsWith(link.href);
          const href = getHref(link);
          return (
            <Link
              key={link.label}
              href={href}
              className={`relative flex items-center gap-3 px-3 py-2.5 text-xs font-headline font-semibold tracking-widest transition-colors rounded-sm ${
                isActive
                  ? "text-primary bg-surface-container"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
              }`}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 bg-primary" />
              )}
              <span className="material-symbols-outlined text-base">
                {link.icon}
              </span>
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="p-3 mt-auto flex flex-col gap-2">
        <Link
          href="/"
          className="cta-gradient text-on-primary-fixed font-headline font-bold text-xs tracking-widest px-4 py-2.5 rounded-sm text-center hover:opacity-90 transition-opacity"
        >
          NEW_GAME
        </Link>
      </div>
    </aside>
  );
}
