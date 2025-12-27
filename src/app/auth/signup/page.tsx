"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RadioGroup } from "@headlessui/react";
import { motion } from "framer-motion";
import { User, Mail, Lock, Phone, MapPin, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { setSession, type UserRole } from "@/lib/session";

export default function SignupPage() {
  const router = useRouter();
  const [role, setRole] = React.useState<UserRole>("buyer");
  const [formData, setFormData] = React.useState({
    fullName: "",
    email: "",
    phone: "",
    location: "",
    craftType: "",
    password: "",
    confirmPassword: "",
  });

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match!");
      return;
    }
    setSession({ role, email: formData.email });
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
        className="w-full max-w-lg relative z-10"
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
              <User className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">
              Create your ArtiSol account
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Join the artisan community and start your Web3 journey
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Role Selection */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                I want to
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
                    {r === "buyer" ? "🛒 Buy NFTs" : "🎨 Sell NFTs"}
                  </RadioGroup.Option>
                ))}
              </RadioGroup>
            </div>

            {/* Full Name */}
            <div>
              <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700">
                <User className="h-4 w-4 text-slate-500" />
                Full Name
              </label>
              <Input
                value={formData.fullName}
                onChange={(e) => updateField("fullName", e.target.value)}
                placeholder="Enter your full name"
                required
              />
            </div>

            {/* Email */}
            <div>
              <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700">
                <Mail className="h-4 w-4 text-slate-500" />
                Email Address
              </label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => updateField("email", e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>

            {/* Phone */}
            <div>
              <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700">
                <Phone className="h-4 w-4 text-slate-500" />
                Phone Number
              </label>
              <Input
                type="tel"
                value={formData.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                placeholder="+91 98765 43210"
              />
            </div>

            {/* Location */}
            <div>
              <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700">
                <MapPin className="h-4 w-4 text-slate-500" />
                Location / City
              </label>
              <Input
                value={formData.location}
                onChange={(e) => updateField("location", e.target.value)}
                placeholder="e.g. Varanasi, Jaipur, Chennai"
              />
            </div>

            {/* Craft Type (only for sellers) */}
            {role === "seller" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Briefcase className="h-4 w-4 text-slate-500" />
                  Craft / Art Type
                </label>
                <select
                  value={formData.craftType}
                  onChange={(e) => updateField("craftType", e.target.value)}
                  className={cn(
                    "h-11 w-full rounded-xl border px-3 text-sm",
                    "border-slate-200 bg-white text-slate-900",
                    "focus:outline-none focus:ring-2 focus:ring-[#0D7B7A] focus:border-[#0D7B7A]",
                  )}
                >
                  <option value="">Select your craft type...</option>
                  <option value="textile">Textile & Weaving</option>
                  <option value="painting">Traditional Painting</option>
                  <option value="pottery">Pottery & Ceramics</option>
                  <option value="metalwork">Metalwork & Jewelry</option>
                  <option value="woodcraft">Wood Carving</option>
                  <option value="embroidery">Embroidery</option>
                  <option value="other">Other</option>
                </select>
              </motion.div>
            )}

            {/* Password */}
            <div>
              <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700">
                <Lock className="h-4 w-4 text-slate-500" />
                Password
              </label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => updateField("password", e.target.value)}
                placeholder="Create a strong password"
                required
              />
            </div>

            {/* Confirm Password */}
            <div>
              <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700">
                <Lock className="h-4 w-4 text-slate-500" />
                Confirm Password
              </label>
              <Input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => updateField("confirmPassword", e.target.value)}
                placeholder="Confirm your password"
                required
              />
            </div>

            {/* Terms */}
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="terms"
                required
                className="mt-1 h-4 w-4 rounded border-slate-300 text-[#0D7B7A] focus:ring-[#0D7B7A]"
              />
              <label htmlFor="terms" className="text-xs text-slate-600">
                I agree to the{" "}
                <span className="text-[#0D7B7A] hover:underline cursor-pointer">
                  Terms of Service
                </span>{" "}
                and{" "}
                <span className="text-[#0D7B7A] hover:underline cursor-pointer">
                  Privacy Policy
                </span>
              </label>
            </div>

            {/* Submit */}
            <Button type="submit" className="w-full">
              Create Account
            </Button>

            {/* Login link */}
            <p className="text-center text-sm text-slate-600">
              Already have an account?{" "}
              <Link
                href="/auth/login"
                className="font-medium text-[#0D7B7A] hover:underline"
              >
                Sign in
              </Link>
            </p>
          </form>
        </div>

        {/* Footer note */}
        <p className="mt-6 text-center text-xs text-slate-500">
          Demo mode — no real data is stored
        </p>
      </motion.div>
    </main>
  );
}
