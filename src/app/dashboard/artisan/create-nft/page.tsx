"use client";

import * as React from "react";
import { DashboardNavbar } from "@/components/dashboard/DashboardNavbar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CloudUpload, Info } from "lucide-react";

const mockAddress = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e";

const categories = [
  "Textile",
  "Painting",
  "Wood Art",
  "Metalwork",
  "Pottery",
  "Jewelry",
  "Other",
];

export default function CreateNftPage() {
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [price, setPrice] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // placeholder: real mint not implemented
    alert("Mint NFT placeholder — form submitted");
  };

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardNavbar
        title="Mint NFT"
        address={mockAddress}
        networkLabel="Ethereum"
      />

      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-6 p-4 md:p-6">
        <DashboardSidebar />

        <main className="min-w-0 flex-1 space-y-6 pb-24">
          <PageHeader
            title="Mint NFT"
            subtitle="Create a new artwork certificate"
          />

          <form onSubmit={handleSubmit}>
            <div className="grid gap-6 lg:grid-cols-2">
              {/* LEFT: FORM */}
              <SectionCard title="Artwork Details">
                <div className="space-y-5">
                  {/* Upload */}
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Artwork Image
                    </label>
                    <label
                      htmlFor="artwork"
                      className={cn(
                        "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed py-10 transition",
                        "border-[color:var(--artisol-card-border)] bg-white/40 hover:bg-black/5",
                      )}
                    >
                      <CloudUpload className="h-6 w-6 text-slate-500" />
                      <span className="text-sm text-slate-600">
                        {file ? file.name : "Click or drag to upload"}
                      </span>
                      <input
                        type="file"
                        id="artwork"
                        accept="image/*"
                        className="sr-only"
                        onChange={(e) =>
                          setFile(e.target.files?.[0] ?? null)
                        }
                      />
                    </label>
                  </div>

                  {/* Title */}
                  <div>
                    <label
                      htmlFor="title"
                      className="mb-1.5 block text-sm font-medium text-slate-700"
                    >
                      Title
                    </label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Banarasi Silk Saree #001"
                      required
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label
                      htmlFor="desc"
                      className="mb-1.5 block text-sm font-medium text-slate-700"
                    >
                      Description
                    </label>
                    <textarea
                      id="desc"
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe the artwork, materials, story…"
                      className={cn(
                        "w-full rounded-xl border px-3 py-2 text-sm",
                        "border-[color:var(--artisol-card-border)] bg-white/60 text-slate-900 placeholder:text-slate-500 backdrop-blur",
                        "focus:outline-none focus:ring-2 focus:ring-[color:var(--artisol-primary)]",
                      )}
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label
                      htmlFor="category"
                      className="mb-1.5 block text-sm font-medium text-slate-700"
                    >
                      Category
                    </label>
                    <select
                      id="category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className={cn(
                        "h-11 w-full rounded-xl border px-3 text-sm",
                        "border-[color:var(--artisol-card-border)] bg-white/60 text-slate-900 backdrop-blur",
                        "focus:outline-none focus:ring-2 focus:ring-[color:var(--artisol-primary)]",
                      )}
                    >
                      <option value="">Select category…</option>
                      {categories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Price */}
                  <div>
                    <label
                      htmlFor="price"
                      className="mb-1.5 block text-sm font-medium text-slate-700"
                    >
                      Price (INR)
                    </label>
                    <Input
                      id="price"
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="e.g. 25000"
                      required
                    />
                  </div>

                  {/* Royalty info */}
                  <div className="flex items-start gap-2 rounded-2xl border border-[color:var(--artisol-card-border)] bg-white/60 p-3 text-sm text-slate-600 backdrop-blur">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--artisol-primary)]" />
                    <span>
                      Royalties are fixed at <strong>10%</strong> on every
                      resale.
                    </span>
                  </div>

                  <Button type="submit" className="w-full">
                    Mint NFT
                  </Button>
                </div>
              </SectionCard>

              {/* RIGHT: PREVIEW */}
              <SectionCard title="Preview">
                <div
                  className={cn(
                    "overflow-hidden rounded-2xl border backdrop-blur",
                    "border-[color:var(--artisol-card-border)] bg-[color:var(--artisol-card)] shadow-sm",
                  )}
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden">
                    {file ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={URL.createObjectURL(file)}
                        alt="preview"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full bg-gradient-to-br from-[color:var(--artisol-primary)]/10 via-white/40 to-[color:var(--artisol-secondary)]/25" />
                    )}
                    <Badge className="absolute left-3 top-3 bg-white/60 backdrop-blur">
                      Preview
                    </Badge>
                  </div>

                  <div className="p-4">
                    <div className="truncate text-sm font-semibold text-slate-900">
                      {title || "NFT Title"}
                    </div>
                    <div className="mt-1 text-sm text-slate-600">
                      {price ? `₹${Number(price).toLocaleString()}` : "₹0"}
                    </div>
                  </div>
                </div>
              </SectionCard>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}
