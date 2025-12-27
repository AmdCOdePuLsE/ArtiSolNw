import * as React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type BestNftCardProps = {
  title: string;
  price: string;
  loading?: boolean;
  onView?: () => void;
  className?: string;
};

export function BestNftCard({
  title,
  price,
  loading,
  onView,
  className,
}: BestNftCardProps) {
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
      <div className="flex items-start gap-4">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-[color:var(--artisol-card-border)] bg-white/60">
          <div className="absolute inset-0 bg-gradient-to-br from-[color:var(--artisol-primary)]/15 to-[color:var(--artisol-secondary)]/25" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-slate-700">Best NFT</div>

          {loading ? (
            <div className="mt-3 space-y-2">
              <div className="h-6 w-48 animate-pulse rounded-lg bg-black/10" />
              <div className="h-4 w-32 animate-pulse rounded-lg bg-black/10" />
            </div>
          ) : (
            <>
              <div className="mt-2 truncate text-lg font-semibold text-slate-900">
                {title}
              </div>
              <div className="mt-1 text-sm text-slate-600">{price}</div>
            </>
          )}
        </div>

        <div className="shrink-0">
          <Button variant="ghost" onClick={onView} disabled={loading}>
            View NFT
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
