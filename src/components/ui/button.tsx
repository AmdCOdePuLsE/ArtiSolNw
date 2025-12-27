import * as React from "react";
import { cn } from "@/lib/utils";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--artisol-primary)] focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        "ring-offset-[color:var(--artisol-bg)]",
        size === "sm" && "px-3 py-1.5 text-xs",
        size === "md" && "px-5 py-2.5 text-sm",
        size === "lg" && "px-6 py-3 text-base",
        variant === "primary" &&
          "bg-[#0D7B7A] text-white shadow-md shadow-[#0D7B7A]/25 hover:bg-[#0a6665] hover:shadow-lg hover:shadow-[#0D7B7A]/30 active:scale-[0.98]",
        variant === "secondary" &&
          "bg-[#D4A574] text-slate-900 shadow-md shadow-[#D4A574]/25 hover:bg-[#c9985f] hover:shadow-lg active:scale-[0.98]",
        variant === "ghost" &&
          "bg-transparent text-slate-700 border border-slate-300 hover:bg-slate-100 hover:border-slate-400",
        className,
      )}
      {...props}
    />
  );
}
