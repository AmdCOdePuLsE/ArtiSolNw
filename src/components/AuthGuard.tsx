"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { getSession, type UserRole } from "@/lib/session";

export function AuthGuard({
  role,
  children,
}: {
  role: UserRole;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    const session = getSession();
    if (!session) {
      router.replace(`/auth/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (session.role !== role) {
      router.replace(session.role === "buyer" ? "/buyer/marketplace" : "/seller/dashboard");
      return;
    }
    setReady(true);
  }, [pathname, role, router]);

  if (!ready) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="text-sm text-slate-300">Loading…</div>
      </div>
    );
  }

  return <>{children}</>;
}
