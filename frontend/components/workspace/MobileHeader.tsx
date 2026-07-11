"use client";

export default function MobileHeader({
  onOpenSidebar,
  onOpenAccountModal,
  userInitial,
}: {
  onOpenSidebar: () => void;
  onOpenAccountModal: () => void;
  userInitial: string;
}) {
  return (
    <header style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 16px", height: 52, flexShrink: 0,
      background: "rgba(7,12,26,0.97)",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
    }}>
      <button
        type="button"
        aria-label="Open menu"
        onClick={onOpenSidebar}
        style={{
          width: 36, height: 36, borderRadius: 9, flexShrink: 0,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          color: "#8892a8", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 17, transition: "all 0.15s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(201,165,92,0.3)"; e.currentTarget.style.color = "#c9a55c"; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "#8892a8"; }}
      >
        ☰
      </button>

      <span style={{
        fontFamily: "var(--font-instrument-serif)",
        fontSize: 17, color: "#ede8df",
      }}>
        Astro Mind
      </span>

      <button
        type="button"
        aria-label="Account and usage"
        onClick={onOpenAccountModal}
        style={{
          width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
          background: "linear-gradient(135deg, #c9a55c, #a67c42)",
          border: "2px solid rgba(201,165,92,0.3)",
          color: "#060a14", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "var(--font-space-grotesk)", fontSize: 13, fontWeight: 700,
          boxShadow: "0 0 10px rgba(201,165,92,0.15)",
        }}
      >
        {userInitial}
      </button>
    </header>
  );
}
