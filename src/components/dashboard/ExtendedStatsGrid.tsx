import * as React from "react";
import { StatCard, type StatCardProps } from "@/components/dashboard/StatCard";

export type ExtendedStatsGridProps = {
  items: StatCardProps[];
};

export function ExtendedStatsGrid({ items }: ExtendedStatsGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <StatCard key={item.title} {...item} />
      ))}
    </div>
  );
}
