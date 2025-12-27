"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { RadioGroup } from "@headlessui/react";
import { motion } from "framer-motion";
import { LogIn, Mail, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { setSession, type UserRole } from "@/lib/session";

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");

  const [role, setRole] = React.useState<UserRole>("buyer");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [rememberMe, setRememberMe] = React.useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSession({ role, email });
    if (next) {
      router.push(next);
      return;
    }
    router.push(role === "buyer" ? "/buyer/marketplace" : "/seller/dashboard");
  };

  return (
    <main 
      className="flex min-h-[calc(100vh-80px)] items-center justify-center px-4 py-8 relative"
      style={{
        backgroundImage: "url('/auth-bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Card */}
        <div
          className={cn(
            "rounded-3xl border p-8 backdrop-blur-sm",
            "border-[color:var(--artisol-card-border)] bg-white/80 shadow-xl shadow-black/5",
          )}
        >
          {/* Header */}
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-[#0D7B7A] text-white shadow-lg shadow-[#0D7B7A]/30">
              <LogIn className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Welcome back</h1>
            <p className="mt-2 text-sm text-slate-600">
              Sign in to continue to your dashboard
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Role Selection */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                I am a
              </label>
              <RadioGroup
                value={role}
                onChange={setRole}
                className="grid grid-cols-2 gap-3"
              >
                {(["buyer", "seller"] as const).map((r) => (
                  <RadioGroup.Option
                    key={r}
                    value={r}
                    className={({ checked }) =>
                      cn(
                        "cursor-pointer rounded-xl border-2 px-4 py-3 text-center text-sm font-medium transition-all",
                        checked
                          ? "border-[#0D7B7A] bg-[#0D7B7A]/10 text-[#0D7B7A] shadow-sm"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
                      )
                    }
                  >
                    {r === "buyer" ? "🛒 Buyer" : "🎨 Seller"}
                  </RadioGroup.Option>
                ))}
              </RadioGroup>
            </div>

            {/* Email */}
            <div>
              <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700">
                <Mail className="h-4 w-4 text-slate-500" />
                Email Address
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700">
                <Lock className="h-4 w-4 text-slate-500" />
                Password
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>

            {/* Remember me & Forgot password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-[#0D7B7A] focus:ring-[#0D7B7A]"
                />
                Remember me
              </label>
              <button
                type="button"
                className="text-sm font-medium text-[#0D7B7A] hover:underline"
              >
                Forgot password?
              </button>
            </div>

            {/* Submit */}
            <Button type="submit" className="w-full">
              Sign In
            </Button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-500">Or</span>
              </div>
            </div>

            {/* Social login placeholder */}
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => alert("Wallet connect coming soon!")}
            >
              🔗 Connect Wallet
            </Button>

            {/* Signup link */}
            <p className="text-center text-sm text-slate-600">
              Don't have an account?{" "}
              <Link
                href="/auth/signup"
                className="font-medium text-[#0D7B7A] hover:underline"
              >
                Create account
              </Link>
            </p>
          </form>
        </div>

        {/* Footer note */}
        <p className="mt-6 text-center text-xs text-slate-500">
          Demo mode — no real authentication
        </p>
      </motion.div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense
      fallback={
        <main className="flex min-h-[calc(100vh-80px)] items-center justify-center px-4 py-8">
          <div className="text-sm text-slate-600">Loading…</div>
        </main>
      }
    >
      <LoginInner />
    </React.Suspense>
  );
}
