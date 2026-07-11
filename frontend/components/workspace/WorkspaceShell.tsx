"use client";

import { useTranslation } from "@/lib/i18n/LanguageProvider";

export type PanelState = "open" | "collapsed" | "hidden";

const SIDEBAR_W: Record<PanelState, number> = { open: 280, collapsed: 12, hidden: 0 };

const STRIP_STYLE: React.CSSProperties = {
  position: "absolute", inset: 0,
  display: "flex", alignItems: "center", justifyContent: "center",
  cursor: "pointer",
};

const BAR_STYLE: React.CSSProperties = {
  width: 3, height: 20,
  background: "rgba(201,165,92,0.45)",
  borderRadius: 1.5,
};

export default function WorkspaceShell({
  sidebar,
  children,
  sidebarState = "open",
  onToggleSidebar,
}: {
  sidebar: React.ReactNode;
  children: React.ReactNode;
  sidebarState?: PanelState;
  onToggleSidebar?: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex h-screen overflow-hidden bg-transparent text-ink" style={{ position: "relative", zIndex: 1 }}>
      {/* Left sidebar */}
      <aside
        className="relative flex shrink-0 flex-col border-r border-line"
        style={{
          width: SIDEBAR_W[sidebarState],
          overflow: "hidden",
          transition: "width 250ms ease",
        }}
      >
        <div style={{
          opacity: sidebarState === "open" ? 1 : 0,
          transition: "opacity 100ms ease",
          pointerEvents: sidebarState === "open" ? undefined : "none",
          minWidth: 280, height: "100%",
          display: "flex", flexDirection: "column",
        }}>
          {sidebar}
        </div>
        {sidebarState === "collapsed" && (
          <div
            onClick={onToggleSidebar}
            title={t("sidebar").expand}
            style={STRIP_STYLE}
          >
            <div style={BAR_STYLE} />
          </div>
        )}
      </aside>

      {/* Main content */}
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {children}
      </main>
    </div>
  );
}
