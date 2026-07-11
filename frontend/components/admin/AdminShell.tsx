export default function AdminShell({
  sidebar,
  children,
}: {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw", background: "#060a14", overflow: "hidden" }}>
      {sidebar}
      <div style={{
        flex: 1, height: "100vh", overflowY: "auto",
        padding: "clamp(24px, 3vw, 40px)",
        background: "#060a14",
        scrollbarWidth: "thin" as const,
        scrollbarColor: "rgba(255,255,255,0.08) transparent",
      }}>
        {children}
      </div>
    </div>
  );
}
