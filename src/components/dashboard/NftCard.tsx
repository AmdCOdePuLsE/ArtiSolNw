import * as React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type NftCardProps = {
  title: string;
  price: string;
  status: "Listed" | "Sold" | "Auction";
  imageUrl?: string;
  onViewDetails?: () => void;
};

const statusStyles: Record<NftCardProps["status"], string> = {
  Listed: "bg-[color:var(--artisol-primary)]/10 text-[color:var(--artisol-primary)]",
  Sold: "bg-black/10 text-slate-700",
  Auction: "bg-[color:var(--artisol-secondary)]/20 text-slate-900",
};

export function NftCard({
  title,
  price,
  status,
  imageUrl,
  onViewDetails,
}: NftCardProps) {
  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 420, damping: 32 }}
      className={cn(
        "overflow-hidden rounded-2xl border backdrop-blur",
        "border-[color:var(--artisol-card-border)] bg-[color:var(--artisol-card)] shadow-sm",
      )}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={title} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-[color:var(--artisol-primary)]/10 via-white/40 to-[color:var(--artisol-secondary)]/25" />
        )}
        <div className="absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-medium backdrop-blur border border-[color:var(--artisol-card-border)] bg-white/60">
          <span className={cn("rounded-full px-2 py-0.5", statusStyles[status])}>
            {status}
          </span>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-slate-900">
              {title}
            </div>
            <div className="mt-1 text-sm text-slate-600">{price}</div>
          </div>
        </div>

        <div className="mt-4">
          <Button variant="secondary" className="w-full" onClick={onViewDetails}>
            View details
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
