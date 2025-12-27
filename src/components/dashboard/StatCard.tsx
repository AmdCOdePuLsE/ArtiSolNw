import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export type StatCardProps = {
  title: string;
  value: string;
  subtitle?: string;
  icon?: React.ReactNode;
  loading?: boolean;
  className?: string;
};

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  loading,
  className,
}: StatCardProps) {
  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 420, damping: 32 }}
      className={cn(
        "rounded-2xl border p-4 md:p-6 backdrop-blur",
        "border-[color:var(--artisol-card-border)] bg-[color:var(--artisol-card)] shadow-sm",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium text-slate-700">{title}</div>
          <div className="mt-3">
            {loading ? (
              <div className="space-y-2">
                <div className="h-8 w-40 animate-pulse rounded-lg bg-black/10" />
                <div className="h-4 w-56 animate-pulse rounded-lg bg-black/10" />
              </div>
            ) : (
              <>
                <div className="truncate text-3xl font-bold text-slate-900">
                  {value}
                </div>
                {subtitle ? (
                  <div className="mt-1 text-sm text-slate-600">{subtitle}</div>
                ) : null}
              </>
            )}
          </div>
        </div>

        {icon ? (
          <div
            className={cn(
              "grid h-10 w-10 place-items-center rounded-2xl border backdrop-blur",
              "border-[color:var(--artisol-card-border)] bg-white/60 text-[color:var(--artisol-primary)]",
            )}
            aria-hidden
          >
            {icon}
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}
