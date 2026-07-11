import Image from "next/image";

import { cn } from "@/lib/utils";

/** AstroMind orb mark — app/brand icon, also used as the assistant avatar. */
export function BrandIcon({
  size = 32,
  priority = false,
  className,
}: {
  size?: number;
  priority?: boolean;
  className?: string;
}) {
  return (
    <Image
      src="/brand.png"
      alt="AstroMind"
      width={size}
      height={size}
      priority={priority}
      className={cn("rounded-full ring-1 ring-aurora/30", className)}
    />
  );
}
