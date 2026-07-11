import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-xl border border-hairline bg-white/5 px-3 py-2 text-sm text-ivory",
        "placeholder:text-ivory/40 outline-none backdrop-blur-sm transition-colors duration-200",
        "focus:border-aurora/70 focus:ring-1 focus:ring-aurora/50",
        "[color-scheme:dark]",
        className,
      )}
      {...props}
    />
  );
}
