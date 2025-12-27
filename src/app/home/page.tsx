"use client";

import Link from "next/link";
import {
  Banknote,
  Coins,
  Crown,
  Layers3,
  PlusCircle,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { DashboardNavbar } from "@/components/dashboard/DashboardNavbar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { StatsGrid } from "@/components/dashboard/StatsGrid";
import { ExtendedStatsGrid } from "@/components/dashboard/ExtendedStatsGrid";
import { BestNftCard } from "@/components/dashboard/BestNftCard";
import { ChartPlaceholder } from "@/components/dashboard/ChartPlaceholder";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  useArtisanStats,
  usePlatformStats,
  useBestNFT,
} from "@/lib/hooks/useDashboardStats";

const mockAddress = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e";

export default function HomeDashboard() {
  const { data: artisanStats, isLoading: artisanLoading } =
    useArtisanStats(mockAddress);
  const { data: platformStats, isLoading: platformLoading } = usePlatformStats();
  const { data: bestNFT, isLoading: bestNFTLoading } = useBestNFT(mockAddress);

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardNavbar
        title="My Dashboard"
        address={mockAddress}
        networkLabel="Ethereum"
      />

      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-6 p-4 md:p-6">
        <DashboardSidebar />

        <main className="min-w-0 flex-1 space-y-6 pb-24">
          <PageHeader
            title="My Dashboard"
            subtitle="Welcome back, Artisan!"
            actions={
              <Link href="/dashboard/artisan/create-nft">
                <Button>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Mint new NFT
                </Button>
              </Link>
            }
          />

          {/* WELCOME HERO */}
          <SectionCard className="relative overflow-hidden bg-gradient-to-br from-[color:var(--artisol-primary)]/5 via-white/70 to-[color:var(--artisol-secondary)]/10">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-lg font-semibold text-slate-900">
                  Welcome back, Artisan!
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  {mockAddress.slice(0, 6)}…{mockAddress.slice(-4)}
                </div>
              </div>
              <Badge className="bg-[color:var(--artisol-primary)]/10 text-[color:var(--artisol-primary)]">
                <Sparkles className="mr-1 h-3 w-3" />
                Creator Mode
              </Badge>
            </div>
          </SectionCard>

          {/* MVP STATS */}
          <StatsGrid
            items={[
              {
                title: "My NFTs Minted",
                value: artisanLoading ? "—" : String(artisanStats.nftsMinted),
                subtitle: "Total NFTs you've created",
                icon: <Crown className="h-4 w-4" />,
                loading: artisanLoading,
              },
              {
                title: "My Earnings",
                value: artisanLoading ? "—" : artisanStats.totalEarnings,
                subtitle: "Primary sales earnings",
                icon: <Wallet className="h-4 w-4" />,
                loading: artisanLoading,
              },
              {
                title: "Total Platform NFTs",
                value: platformLoading
                  ? "—"
                  : String(platformStats.totalNFTs.toLocaleString()),
                subtitle: "NFTs minted on ArtiSol",
                icon: <Layers3 className="h-4 w-4" />,
                loading: platformLoading,
              },
              {
                title: "Total Artists",
                value: platformLoading
                  ? "—"
                  : String(platformStats.totalArtists.toLocaleString()),
                subtitle: "Artisans on‑chain",
                icon: <Users className="h-4 w-4" />,
                loading: platformLoading,
              },
            ]}
          />

          {/* EXTENDED STATS + BEST NFT */}
          <div className="grid gap-4 xl:grid-cols-3">
            <div className="xl:col-span-2">
              <ExtendedStatsGrid
                items={[
                  {
                    title: "My Royalties",
                    value: artisanLoading ? "—" : artisanStats.totalRoyalties,
                    subtitle: "Resale royalties earned",
                    icon: <Coins className="h-4 w-4" />,
                    loading: artisanLoading,
                  },
                  {
                    title: "Average Price",
                    value: artisanLoading ? "—" : artisanStats.averagePrice,
                    subtitle: "Avg primary sale price",
                    icon: <Banknote className="h-4 w-4" />,
                    loading: artisanLoading,
                  },
                  {
                    title: "Monthly Growth",
                    value: "+32%",
                    subtitle: "This month vs last month",
                    icon: <TrendingUp className="h-4 w-4" />,
                    loading: false,
                  },
                ]}
              />
            </div>

            <BestNftCard
              title={bestNFTLoading ? "…" : bestNFT.title}
              price={bestNFTLoading ? "…" : bestNFT.price}
              loading={bestNFTLoading}
              onView={() => undefined}
            />
          </div>

          {/* MORE EXTENDED */}
          <ExtendedStatsGrid
            items={[
              {
                title: "Total Collectors",
                value: platformLoading
                  ? "—"
                  : platformStats.totalCollectors.toLocaleString(),
                subtitle: "Unique collectors on ArtiSol",
                icon: <Users className="h-4 w-4" />,
                loading: platformLoading,
              },
              {
                title: "Platform Value",
                value: platformLoading
                  ? "—"
                  : platformStats.totalPlatformValue,
                subtitle: "Sum of all primary sale prices",
                icon: <Wallet className="h-4 w-4" />,
                loading: platformLoading,
              },
            ]}
          />

          {/* CHARTS */}
          <div className="grid gap-4 md:grid-cols-2">
            <ChartPlaceholder
              title="Sales vs Royalties"
              subtitle="Donut chart placeholder"
            />
            <ChartPlaceholder
              title="Last 12 Months Earnings"
              subtitle="Line chart placeholder"
            />
          </div>

          {/* QUICK ACTIONS */}
          <SectionCard title="Quick Actions">
            <div className="flex flex-wrap gap-3">
              <Link href="/dashboard/artisan/create-nft">
                <Button>Mint New NFT</Button>
              </Link>
              <Link href="/dashboard/artisan/my-nfts">
                <Button variant="secondary">View My NFTs</Button>
              </Link>
              <Button variant="ghost" disabled>
                Withdraw Earnings
              </Button>
            </div>
          </SectionCard>
        </main>
      </div>
    </div>
  );
}
