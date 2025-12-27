"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { clearSession, getSession } from "@/lib/session";

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const session = getSession();

  if (pathname === "/home" || pathname.startsWith("/dashboard")) {
    return null;
  }

  const isActive = (href: string) => pathname === href;

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#0D7B7A] text-white font-bold">
            A
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-slate-900">ArtiSol</div>
            <div className="text-xs text-slate-500">ArtistRegistry</div>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          {session ? (
            <>
              <Badge>{session.role.toUpperCase()}</Badge>
              <Button
                variant="secondary"
                onClick={() => {
                  clearSession();
                  router.push("/");
                  router.refresh();
                }}
              >
                Logout
              </Button>
            </>
          ) : (
            <>
              <Link href="/auth/login">
                <Button variant="ghost">Login</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
