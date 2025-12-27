import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          "h-11 w-full rounded-xl border px-4 text-sm transition-all duration-200",
          "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400",
          "hover:border-slate-300",
          "focus:outline-none focus:ring-2 focus:ring-[#0D7B7A] focus:border-[#0D7B7A]",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";
