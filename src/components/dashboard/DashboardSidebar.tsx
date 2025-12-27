"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Coins,
  Gauge,
  Image,
  Layers3,
  PlusCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Item = {
  label: string;
  href: string;
  icon: React.ReactNode;
};

const items: Item[] = [
  { label: "Dashboard", href: "/home", icon: <Gauge className="h-4 w-4" /> },
  {
    label: "My NFTs",
    href: "/dashboard/artisan/my-nfts",
    icon: <Image className="h-4 w-4" />,
  },
  {
    label: "Mint NFT",
    href: "/dashboard/artisan/create-nft",
    icon: <PlusCircle className="h-4 w-4" />,
  },
  {
    label: "Earnings",
    href: "/home#earnings",
    icon: <Coins className="h-4 w-4" />,
  },
  { label: "Learn", href: "/home#learn", icon: <BookOpen className="h-4 w-4" /> },
];

export type DashboardSidebarProps = {
  collapsed?: boolean;
  onToggleCollapsed?: (next: boolean) => void;
};

export function DashboardSidebar({
  collapsed,
  onToggleCollapsed,
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const isCollapsed = collapsed ?? false;

  return (
    <aside
      className={cn(
        "hidden md:flex md:flex-col",
        isCollapsed ? "w-16" : "w-64",
      )}
    >
      <div
        className={cn(
          "h-full rounded-2xl border bg-[color:var(--artisol-card)] backdrop-blur shadow-sm",
          "border-[color:var(--artisol-card-border)]",
        )}
      >
        <div className="flex items-center justify-between gap-2 p-3">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-2xl bg-[color:var(--artisol-primary)] text-white">
              <Layers3 className="h-4 w-4" />
            </div>
            {!isCollapsed ? (
              <div className="text-sm font-semibold text-slate-900">Menu</div>
            ) : null}
          </div>

          <button
            type="button"
            className={cn(
              "rounded-xl border px-2 py-1 text-xs text-slate-700 hover:bg-black/5",
              "border-[color:var(--artisol-card-border)] bg-white/40",
            )}
            onClick={() => onToggleCollapsed?.(!isCollapsed)}
          >
            {isCollapsed ? ">" : "<"}
          </button>
        </div>

        <nav className="px-2 pb-3">
          {items.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-3 py-2 text-sm",
                  active
                    ? "bg-[color:var(--artisol-primary)]/10 text-slate-900"
                    : "text-slate-700 hover:bg-black/5",
                )}
              >
                <span className="text-[color:var(--artisol-primary)]">
                  {item.icon}
                </span>
                {!isCollapsed ? <span>{item.label}</span> : null}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
