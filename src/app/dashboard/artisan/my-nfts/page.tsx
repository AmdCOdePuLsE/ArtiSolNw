"use client";

import * as React from "react";
import Link from "next/link";
import { DashboardNavbar } from "@/components/dashboard/DashboardNavbar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { NftCard, type NftCardProps } from "@/components/dashboard/NftCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { PlusCircle, Search } from "lucide-react";

const mockAddress = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e";

const filters = ["All", "Listed", "Sold", "Auction"] as const;
type Filter = (typeof filters)[number];

const mockNfts: NftCardProps[] = [
  { title: "Silk Saree #342", price: "₹24,000", status: "Listed" },
  { title: "Kalamkari #18", price: "₹15,500", status: "Sold" },
  { title: "Zardozi Shawl #91", price: "₹32,100", status: "Listed" },
  { title: "Phulkari #56", price: "₹18,000", status: "Auction" },
  { title: "Channapatna Toy #201", price: "₹4,800", status: "Sold" },
];

export default function MyNftsPage() {
  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState<Filter>("All");

  const displayed = mockNfts.filter((n) => {
    const matchText =
      !search || n.title.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "All" || n.status === filter;
    return matchText && matchFilter;
  });

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardNavbar
        title="My NFTs"
        address={mockAddress}
        networkLabel="Ethereum"
      />

      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-6 p-4 md:p-6">
        <DashboardSidebar />

        <main className="min-w-0 flex-1 space-y-6 pb-24">
          <PageHeader
            title="My NFTs"
            subtitle="Manage your minted artworks"
            actions={
              <Link href="/dashboard/artisan/create-nft">
                <Button>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Mint New
                </Button>
              </Link>
            }
          />

          {/* Filters toolbar */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                placeholder="Search NFTs…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {filters.map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition",
                    "border-[color:var(--artisol-card-border)] backdrop-blur",
                    filter === f
                      ? "bg-[color:var(--artisol-primary)] text-white"
                      : "bg-white/60 text-slate-700 hover:bg-black/5",
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Grid */}
          {displayed.length === 0 ? (
            <div className="flex min-h-[180px] items-center justify-center rounded-2xl border border-[color:var(--artisol-card-border)] bg-[color:var(--artisol-card)] text-sm text-slate-600">
              No NFTs match your filters.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {displayed.map((nft) => (
                <NftCard key={nft.title} {...nft} />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
