import * as React from "react";
import { cn } from "@/lib/utils";

export type ChartPlaceholderProps = {
  title: string;
  subtitle?: string;
  className?: string;
};

export function ChartPlaceholder({ title, subtitle, className }: ChartPlaceholderProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4 md:p-6 backdrop-blur",
        "border-[color:var(--artisol-card-border)] bg-[color:var(--artisol-card)] shadow-sm",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          {subtitle ? <div className="mt-1 text-sm text-slate-600">{subtitle}</div> : null}
        </div>
      </div>

      <div className="mt-4 grid place-items-center rounded-2xl border border-[color:var(--artisol-card-border)] bg-white/40 p-10">
        <div className="h-28 w-28 rounded-full border-4 border-[color:var(--artisol-primary)]/30" />
        <div className="mt-4 h-3 w-56 rounded bg-black/10" />
      </div>
    </div>
  );
}
