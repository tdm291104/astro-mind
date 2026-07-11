"use client";

import { useEffect } from "react";

interface DrawerOverlayProps {
  open: boolean;
  side: "left" | "right";
  width?: number;
  onClose: () => void;
  children: React.ReactNode;
}

export default function DrawerOverlay({
  open,
  side,
  width = 280,
  onClose,
  children,
}: DrawerOverlayProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const slideOut = side === "left" ? `translateX(-${width}px)` : `translateX(${width}px)`;

  return (
    <div
      aria-hidden={!open}
      style={{
        position: "fixed", inset: 0, zIndex: 300,
        pointerEvents: open ? "auto" : "none",
      }}
    >
      <div
        data-testid="drawer-backdrop"
        onClick={onClose}
        style={{
          position: "absolute", inset: 0,
          background: "rgba(0,0,0,0.4)",
          opacity: open ? 1 : 0,
          transition: "opacity 300ms ease",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 0, bottom: 0,
          [side]: 0,
          width,
          transform: open ? "translateX(0)" : slideOut,
          transition: "transform 300ms ease",
          background: "rgba(6,10,20,0.97)",
          borderRight: side === "left" ? "1px solid rgba(255,255,255,0.08)" : undefined,
          borderLeft: side === "right" ? "1px solid rgba(255,255,255,0.08)" : undefined,
          overflowY: "auto",
        }}
      >
        {children}
      </div>
    </div>
  );
}
