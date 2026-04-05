"use client";

import { type ReactNode } from "react";
import TopNav from "./TopNav";
import SideNav from "./SideNav";
import MobileNav from "./MobileNav";

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-surface grid-bg">
      <TopNav />
      <SideNav />
      <main className="pt-14 pb-16 lg:pb-0 lg:pl-56">
        <div className="p-4 md:p-6 lg:p-8">{children}</div>
      </main>
      <MobileNav />
    </div>
  );
}
