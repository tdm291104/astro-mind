import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Button({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium",
        "bg-gradient-to-br from-aurora to-[#a67c42] text-void",
        "transition-all duration-200 hover:shadow-glow hover:brightness-110",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aurora/60",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-none disabled:hover:brightness-100",
        className,
      )}
      {...props}
    />
  );
}
