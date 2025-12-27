import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs",
        "border-[color:var(--artisol-card-border)] bg-white/60 text-slate-700 backdrop-blur",
        className,
      )}
      {...props}
    />
  );
}
