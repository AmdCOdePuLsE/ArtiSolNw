"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type DashboardNavbarProps = {
  title: string;
  address?: string | null;
  networkLabel?: string;
};

function shortenAddress(address: string) {
  if (address.length < 10) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function DashboardNavbar({
  title,
  address,
  networkLabel = "Ethereum",
}: DashboardNavbarProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="sticky top-0 z-40 border-b border-[color:var(--artisol-card-border)] bg-[color:var(--artisol-bg)]/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-6">
        <Link href="/" className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-2xl bg-[color:var(--artisol-primary)] text-white font-semibold">
            A
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-slate-900">ArtiSol</div>
            <div className="text-xs text-slate-600">ArtistRegistry</div>
          </div>
        </Link>

        <div className="hidden md:block">
          <div className="text-sm font-semibold text-slate-900">{title}</div>
        </div>

        <div className="flex items-center gap-2">
          {address ? (
            <div className="hidden sm:flex items-center gap-2 rounded-full border border-[color:var(--artisol-card-border)] bg-white/60 px-3 py-1 text-xs text-slate-700 backdrop-blur">
              <span className="font-medium">{shortenAddress(address)}</span>
            </div>
          ) : null}

          <div className="hidden sm:flex items-center gap-2 rounded-full border border-[color:var(--artisol-card-border)] bg-white/60 px-3 py-1 text-xs text-slate-700 backdrop-blur">
            Network: <span className="font-medium">{networkLabel}</span>
          </div>

          <div className="relative">
            <Button
              variant="ghost"
              aria-haspopup="menu"
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className="rounded-full"
            >
              <span className="grid h-8 w-8 place-items-center rounded-full bg-black/10 text-slate-800">
                U
              </span>
              <ChevronDown className="ml-1 h-4 w-4 text-slate-600" />
            </Button>

            {open ? (
              <div
                role="menu"
                className={cn(
                  "absolute right-0 mt-2 w-44 overflow-hidden rounded-2xl border bg-white/80 backdrop-blur shadow-sm",
                  "border-[color:var(--artisol-card-border)]",
                )}
              >
                <button
                  role="menuitem"
                  className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-black/5"
                  onClick={() => setOpen(false)}
                >
                  Profile
                </button>
                <button
                  role="menuitem"
                  className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-black/5"
                  onClick={() => setOpen(false)}
                >
                  Settings
                </button>
                <button
                  role="menuitem"
                  className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-black/5"
                  onClick={() => setOpen(false)}
                >
                  Logout
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
