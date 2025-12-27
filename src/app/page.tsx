"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  Coins,
  Paintbrush,
  Rocket,
  ShieldCheck,
  Users,
  Wallet,
  Package,
  ShoppingCart,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { providers, Contract, utils } from "ethers";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.08 },
  }),
};

function StatBadge({
  value,
  label,
  icon,
}: {
  value: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <div className="grid h-11 w-11 place-items-center rounded-2xl border border-[color:var(--artisol-card-border)] bg-white/70 text-[color:var(--artisol-primary)] backdrop-blur">
        {icon}
      </div>
      <div className="text-xl font-bold text-slate-900">{value}</div>
      <div className="text-sm text-slate-600">{label}</div>
    </div>
  );
}

const steps = [
  { title: "Connect Wallet", icon: <Wallet className="h-5 w-5" /> },
  { title: "Create Profile", icon: <Users className="h-5 w-5" /> },
  { title: "Mint NFT", icon: <Paintbrush className="h-5 w-5" /> },
  { title: "Sell to Collectors", icon: <Coins className="h-5 w-5" /> },
  { title: "Earn Royalties", icon: <Rocket className="h-5 w-5" /> },
];

// Simple ABI for marketplace contract
const MARKETPLACE_ABI = [
  "function createMarketItem(string memory name, uint256 price) public",
  "function createSale(uint256 itemId) public payable",
  "function fulfillOrder(uint256 itemId) public",
];

export default function Home() {
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string>("0");
  const [role, setRole] = useState<"seller" | "buyer">("seller");
  const [name, setName] = useState("Demo Product NFT");
  const [price, setPrice] = useState("0.01");
  const [listing, setListing] = useState(false);
  const [buying, setBuying] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [connecting, setConnecting] = useState(false);

  // Check if wallet is already connected
  useEffect(() => {
    const checkConnection = async () => {
      if (typeof window !== "undefined" && (window as any).ethereum) {
        const provider = new providers.Web3Provider((window as any).ethereum);
        const accounts = await provider.listAccounts();
        if (accounts.length > 0) {
          setAddress(accounts[0]);
          const bal = await provider.getBalance(accounts[0]);
          setBalance(utils.formatEther(bal));
        }
      }
    };
    checkConnection();
  }, []);

  // Connect wallet
  const connectWallet = async () => {
    if (typeof window === "undefined" || !(window as any).ethereum) {
      alert("Please install MetaMask to use this feature!");
      return;
    }
    setConnecting(true);
    try {
      const provider = new providers.Web3Provider((window as any).ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = provider.getSigner();
      const addr = await signer.getAddress();
      setAddress(addr);
      const bal = await provider.getBalance(addr);
      setBalance(utils.formatEther(bal));
    } catch (error) {
      console.error("Error connecting wallet:", error);
    } finally {
      setConnecting(false);
    }
  };

  // Get contract instance
  const getContract = async () => {
    if (typeof window === "undefined" || !(window as any).ethereum) return null;
    const provider = new providers.Web3Provider((window as any).ethereum);
    const signer = provider.getSigner();
    const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
    if (!contractAddress) {
      console.error("Contract address not configured");
      return null;
    }
    return new Contract(contractAddress, MARKETPLACE_ABI, signer);
  };

  const listNFT = async () => {
    const contract = await getContract();
    if (!contract) return;
    setListing(true);
    try {
      const tx = await contract.createMarketItem(name, utils.parseEther(price));
      await tx.wait();
      alert("NFT Listed Successfully!");
    } catch (error) {
      console.error("Error listing NFT:", error);
      alert("Error listing NFT. Check console for details.");
    } finally {
      setListing(false);
    }
  };

  const buyNFT = async () => {
    const contract = await getContract();
    if (!contract) return;
    setBuying(true);
    try {
      const tx = await contract.createSale(1, { value: utils.parseEther("0.01") });
      await tx.wait();
      alert("NFT Purchased! Held in escrow until delivery confirmed.");
    } catch (error) {
      console.error("Error buying NFT:", error);
      alert("Error buying NFT. Check console for details.");
    } finally {
      setBuying(false);
    }
  };

  const confirmDelivery = async () => {
    const contract = await getContract();
    if (!contract) return;
    setConfirming(true);
    try {
      const tx = await contract.fulfillOrder(1);
      await tx.wait();
      alert("Delivery confirmed! Payment released to seller.");
    } catch (error) {
      console.error("Error confirming delivery:", error);
      alert("Error confirming delivery. Check console for details.");
    } finally {
      setConfirming(false);
    }
  };

  return (
    <main className="overflow-x-hidden">
      {/* ========== HERO ========== */}
      <section className="mx-auto grid max-w-6xl gap-12 px-6 py-16 md:grid-cols-2 md:items-center md:py-24">
        <motion.div initial="hidden" animate="visible" custom={0} variants={fadeUp}>
          <h1 className="text-3xl font-bold leading-tight tracking-tight text-slate-900 md:text-5xl">
            Empowering artisans <br className="hidden md:inline" />
            with{" "}
            <span className="text-[color:var(--artisol-primary)]">
              Web3 authenticity
            </span>
            .
          </h1>
          <p className="mt-4 max-w-md text-lg text-slate-600">
            Mint NFT certificates for your craft, earn 10% royalties on every
            resale, and connect directly with collectors.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/auth/signup">
              <Button className="w-full sm:w-auto">
                Get Started
              </Button>
            </Link>
            <Link href="#how-it-works">
              <Button variant="secondary" className="w-full sm:w-auto">
                Explore how ArtiSol works
              </Button>
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial="hidden"
          animate="visible"
          custom={2}
          variants={fadeUp}
          className="relative flex items-center justify-center"
        >
          <div className="relative h-72 w-72 md:h-96 md:w-96 lg:h-[450px] lg:w-[450px]">
            <Image
              src="/landing.webp"
              alt="ArtiSol - Empowering Artisans with Web3"
              fill
              className="rounded-2xl object-cover shadow-xl"
              priority
            />
          </div>
          <div className="absolute -left-6 -top-4 h-24 w-24 rounded-full bg-[color:var(--artisol-secondary)]/30 blur-2xl" />
          <div className="absolute -bottom-6 -right-6 h-32 w-32 rounded-full bg-[color:var(--artisol-primary)]/20 blur-2xl" />
        </motion.div>
      </section>

      {/* ========== LIVE MARKETPLACE DEMO ========== */}
      <section className="bg-gradient-to-br from-[color:var(--artisol-primary)]/5 via-white to-[color:var(--artisol-secondary)]/10 py-16 md:py-20">
        <div className="mx-auto max-w-4xl px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={0}
            variants={fadeUp}
            className="text-center mb-10"
          >
            <h2 className="text-2xl font-bold text-slate-900 md:text-3xl">
              🛒 Live NFT Marketplace
            </h2>
            <p className="mt-2 text-slate-600">Experience the complete buyer-seller flow in real-time</p>
          </motion.div>

          {/* Connect Wallet */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={1}
            variants={fadeUp}
            className="flex justify-center mb-8"
          >
            {!address ? (
              <Button
                onClick={connectWallet}
                disabled={connecting}
                className="bg-[#0D7B7A] hover:bg-[#0a6665] text-white px-8 py-4 text-lg rounded-xl"
              >
                {connecting ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Connecting...
                  </>
                ) : (
                  <>
                    <Wallet className="mr-2 h-5 w-5" />
                    Connect Wallet
                  </>
                )}
              </Button>
            ) : (
              <div className="bg-white rounded-xl px-6 py-3 border border-slate-200 shadow-sm">
                <span className="text-slate-500 text-sm">Connected: </span>
                <span className="font-mono text-[#0D7B7A] font-semibold">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </span>
              </div>
            )}
          </motion.div>

          {address && (
            <>
              {/* Role Toggle */}
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={2}
                variants={fadeUp}
                className="flex justify-center gap-4 mb-8"
              >
                <button
                  onClick={() => setRole("seller")}
                  className={cn(
                    "flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300",
                    role === "seller"
                      ? "bg-[#0D7B7A] text-white shadow-lg shadow-[#0D7B7A]/30"
                      : "bg-white text-slate-700 border border-slate-200 hover:border-[#0D7B7A]/30"
                  )}
                >
                  <Package className="h-5 w-5" />
                  Seller
                </button>
                <button
                  onClick={() => setRole("buyer")}
                  className={cn(
                    "flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300",
                    role === "buyer"
                      ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
                      : "bg-white text-slate-700 border border-slate-200 hover:border-emerald-500/30"
                  )}
                >
                  <ShoppingCart className="h-5 w-5" />
                  Buyer
                </button>
              </motion.div>

              {/* Seller Panel */}
              {role === "seller" ? (
                <motion.div
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  custom={3}
                  variants={fadeUp}
                  className={cn(
                    "rounded-2xl border p-8 backdrop-blur relative overflow-hidden",
                    "border-[#0D7B7A]/20 bg-gradient-to-br from-white via-teal-50/50 to-[#0D7B7A]/10 shadow-xl"
                  )}
                >
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#0D7B7A] via-[#14a8a6] to-[#D4A574] rounded-t-2xl" />
                  <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-2">
                    <Package className="h-5 w-5 text-[#0D7B7A]" />
                    Seller: Register Product
                  </h3>
                  <p className="text-slate-500 mb-6">NFT will be minted + listed automatically</p>
                  
                  <div className="space-y-4">
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Product Name"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#0D7B7A] focus:outline-none focus:ring-2 focus:ring-[#0D7B7A]/20 transition-all"
                    />
                    <input
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="Price (ETH)"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#0D7B7A] focus:outline-none focus:ring-2 focus:ring-[#0D7B7A]/20 transition-all"
                    />
                    <Button
                      onClick={listNFT}
                      disabled={listing}
                      className="w-full py-4 text-lg bg-gradient-to-r from-[#0D7B7A] to-[#14a8a6] hover:from-[#0a6665] hover:to-[#0D7B7A]"
                    >
                      {listing ? (
                        <>
                          <span className="animate-spin mr-2">⏳</span>
                          Creating NFT...
                        </>
                      ) : (
                        <>
                          <Paintbrush className="mr-2 h-5 w-5" />
                          Register Product & Mint NFT
                        </>
                      )}
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  custom={3}
                  variants={fadeUp}
                  className={cn(
                    "rounded-2xl border p-8 backdrop-blur",
                    "border-emerald-200 bg-gradient-to-br from-white via-emerald-50/50 to-emerald-100/30 shadow-xl"
                  )}
                >
                  <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-6">
                    <ShoppingCart className="h-5 w-5 text-emerald-500" />
                    Buyer: Complete Flow
                  </h3>
                  
                  <div className="space-y-4">
                    {/* Buy Product */}
                    <div className="bg-white rounded-xl p-5 border border-slate-200">
                      <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                        💰 Buy Product NFT #1 (0.01 ETH)
                      </h4>
                      <Button
                        onClick={buyNFT}
                        disabled={buying}
                        className="bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600"
                      >
                        {buying ? (
                          <>
                            <span className="animate-spin mr-2">⏳</span>
                            Paying...
                          </>
                        ) : (
                          <>
                            💳 Buy Now (NFT On Hold)
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Confirm Delivery */}
                    <div className="bg-white rounded-xl p-5 border border-slate-200">
                      <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-emerald-500" />
                        Delivery Confirmed (Release Payment to Seller)
                      </h4>
                      <Button
                        onClick={confirmDelivery}
                        disabled={confirming}
                        className="bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600"
                      >
                        {confirming ? (
                          <>
                            <span className="animate-spin mr-2">⏳</span>
                            Settling...
                          </>
                        ) : (
                          <>
                            ✅ Confirm Delivery & Pay Seller
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Balance Display */}
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={4}
                variants={fadeUp}
                className="mt-6 rounded-xl bg-white/80 backdrop-blur border border-slate-200 p-5 text-center"
              >
                <h4 className="text-lg font-bold text-slate-800">
                  💰 Current Balance: {parseFloat(balance).toFixed(4)} ETH
                </h4>
                <p className="text-sm text-slate-500 mt-1">Watch this change live!</p>
              </motion.div>
            </>
          )}

          {/* Demo Steps */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={5}
            variants={fadeUp}
            className="mt-10 rounded-2xl bg-gradient-to-r from-amber-50 to-amber-100/50 border border-amber-200 p-8"
          >
            <h3 className="text-center font-bold text-slate-800 mb-6">🎬 30-Second Live Demo</h3>
            <div className="grid md:grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-4xl mb-3">1️⃣</div>
                <h4 className="font-semibold text-slate-800">Seller Registers</h4>
                <p className="text-sm text-slate-600 mt-1">
                  NFT minted + listed<br />
                  <span className="font-semibold">Token #1 created</span>
                </p>
              </div>
              <div>
                <div className="text-4xl mb-3">2️⃣</div>
                <h4 className="font-semibold text-slate-800">Buyer Pays</h4>
                <p className="text-sm text-slate-600 mt-1">
                  0.01 ETH debited<br />
                  <span className="font-semibold">NFT held in escrow</span>
                </p>
              </div>
              <div>
                <div className="text-4xl mb-3">3️⃣</div>
                <h4 className="font-semibold text-slate-800">Delivery Confirmed</h4>
                <p className="text-sm text-slate-600 mt-1">
                  0.01 ETH → Seller<br />
                  <span className="font-semibold">Flow complete ✅</span>
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ========== PROBLEM / SOLUTION ========== */}
      <section className="bg-white/60 py-16 md:py-20">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 md:grid-cols-2">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={0}
            variants={fadeUp}
            className={cn(
              "rounded-2xl border p-6 backdrop-blur",
              "border-[color:var(--artisol-card-border)] bg-[color:var(--artisol-card)] shadow-sm",
            )}
          >
            <div className="text-base font-semibold text-slate-900">The Problem</div>
            <p className="mt-3 text-sm text-slate-600">
              Meet Kokri, a master weaver from Varanasi. She spends months on a
              single Banarasi saree, yet middlemen slash her margins. Buyers
              can&apos;t verify if a piece is authentic, and copies flood the market.
              When her saree resells, she earns nothing. This story repeats for
              30M+ artisans across India.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={1}
            variants={fadeUp}
            className={cn(
              "rounded-2xl border p-6 backdrop-blur",
              "border-[color:var(--artisol-card-border)] bg-[color:var(--artisol-card)] shadow-sm",
            )}
          >
            <div className="text-base font-semibold text-slate-900">
              The ArtiSol Solution
            </div>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--artisol-primary)]" />
                NFT proof of creation (ERC-721 with metadata)
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--artisol-primary)]" />
                10% automatic royalties on every resale
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--artisol-primary)]" />
                Direct artist → collector marketplace
              </li>
            </ul>
          </motion.div>
        </div>
      </section>

      {/* ========== KEY METRICS ========== */}
      <section className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          custom={0}
          variants={fadeUp}
          className="text-center"
        >
          <h2 className="text-2xl font-bold text-slate-900 md:text-3xl">
            Why ArtiSol Matters
          </h2>
        </motion.div>

        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={1}
            variants={fadeUp}
          >
            <StatBadge
              value="30M+"
              label="Artisans globally"
              icon={<Users className="h-5 w-5" />}
            />
          </motion.div>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={2}
            variants={fadeUp}
          >
            <StatBadge
              value="3–4x"
              label="Potential income increase"
              icon={<Coins className="h-5 w-5" />}
            />
          </motion.div>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={3}
            variants={fadeUp}
          >
            <StatBadge
              value="10%"
              label="Lifetime royalties"
              icon={<ShieldCheck className="h-5 w-5" />}
            />
          </motion.div>
        </div>
      </section>

      {/* ========== HOW IT WORKS ========== */}
      <section id="how-it-works" className="bg-white/60 py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={0}
            variants={fadeUp}
            className="text-center"
          >
            <h2 className="text-2xl font-bold text-slate-900 md:text-3xl">
              How It Works
            </h2>
          </motion.div>

          <div className="mt-10 flex snap-x gap-4 overflow-x-auto pb-4 md:grid md:grid-cols-5 md:gap-6 md:overflow-visible">
            {steps.map((step, i) => (
              <motion.div
                key={step.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i + 1}
                variants={fadeUp}
                className={cn(
                  "min-w-[160px] shrink-0 snap-start rounded-2xl border p-4 text-center backdrop-blur",
                  "border-[color:var(--artisol-card-border)] bg-[color:var(--artisol-card)] shadow-sm",
                )}
              >
                <div className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-[color:var(--artisol-primary)]/10 text-[color:var(--artisol-primary)]">
                  {step.icon}
                </div>
                <div className="mt-3 text-xs font-semibold text-slate-700">
                  Step {i + 1}
                </div>
                <div className="mt-1 text-sm font-medium text-slate-900">
                  {step.title}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== CTA ========== */}
      <section className="mx-auto max-w-3xl px-6 py-16 md:py-20">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          custom={0}
          variants={fadeUp}
          className={cn(
            "rounded-2xl border p-8 text-center backdrop-blur",
            "border-[color:var(--artisol-card-border)] bg-[color:var(--artisol-card)] shadow-sm",
          )}
        >
          <h2 className="text-xl font-bold text-slate-900 md:text-2xl">
            Ready to join the artisan community?
          </h2>
          <div className="mt-6">
            <Link href="/auth/signup">
              <Button>
                Get Started <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>
    </main>
  );
}

