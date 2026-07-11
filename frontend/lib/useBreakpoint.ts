import { useEffect, useState } from "react";

export type Breakpoint = "mobile" | "tablet" | "desktop";

function getBreakpoint(): Breakpoint {
  if (typeof window === "undefined") return "desktop";
  if (window.matchMedia("(max-width: 767px)").matches) return "mobile";
  if (window.matchMedia("(max-width: 1279px)").matches) return "tablet";
  return "desktop";
}

export function useBreakpoint(): Breakpoint {
  const [bp, setBp] = useState<Breakpoint>(getBreakpoint);

  useEffect(() => {
    const mql767  = window.matchMedia("(max-width: 767px)");
    const mql1279 = window.matchMedia("(max-width: 1279px)");
    const handler = () => setBp(getBreakpoint());
    mql767.addEventListener("change", handler);
    mql1279.addEventListener("change", handler);
    return () => {
      mql767.removeEventListener("change", handler);
      mql1279.removeEventListener("change", handler);
    };
  }, []);

  return bp;
}
