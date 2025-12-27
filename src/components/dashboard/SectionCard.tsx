import * as React from "react";
import { cn } from "@/lib/utils";

export type SectionCardProps = {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

export function SectionCard({
  title,
  subtitle,
  actions,
  children,
  className,
}: SectionCardProps) {
  return (
    <section
      className={cn(
        "rounded-2xl border p-4 md:p-6 backdrop-blur",
        "border-[color:var(--artisol-card-border)] bg-[color:var(--artisol-card)] shadow-sm",
        className,
      )}
    >
      {(title || subtitle || actions) && (
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            {title && (
              <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            )}
            {subtitle && (
              <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
            )}
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
      )}
      {children}
    </section>
  );
}
