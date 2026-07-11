"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import ChatPanel, { type ChatPanelHandle } from "@/components/chat/ChatPanel";
import AccountModal from "@/components/workspace/AccountModal";
import DrawerOverlay from "@/components/workspace/DrawerOverlay";
import MobileHeader from "@/components/workspace/MobileHeader";
import Sidebar from "@/components/workspace/Sidebar";
import ViewerOverlay from "@/components/workspace/ViewerOverlay";
import WorkspaceShell, { type PanelState } from "@/components/workspace/WorkspaceShell";
import { Starfield } from "@/components/landing/Starfield";
import { getDocuments, type DocumentMeta } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useBreakpoint } from "@/lib/useBreakpoint";

export interface SessionEvent {
  time: Date;
  route: string;
}

const DOCS_PAGE_SIZE = 10;

const SHORTCUT_ROWS = [
  { keys: ["Enter"],          desc: "Gửi tin nhắn" },
  { keys: ["Shift", "Enter"], desc: "Xuống dòng" },
  { keys: ["["],              desc: "Thu gọn / mở sidebar" },
  { keys: ["@search"],        desc: "Search Agent — tìm NASA / arXiv" },
  { keys: ["@notebook"],      desc: "Notebook Agent — hỏi tài liệu đính kèm" },
  { keys: ["@report"],        desc: "Report Agent — tạo báo cáo xu hướng" },
  { keys: ["@chat"],          desc: "Chat Agent — hội thoại thiên văn chung" },
];

function ShortcutsModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.6)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#0c1220",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 16,
          padding: "24px 28px",
          minWidth: 340,
          boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
        }}
      >
        <div style={{
          fontFamily: "var(--font-space-grotesk)", fontSize: 15, fontWeight: 600,
          color: "#ede8df", marginBottom: 18,
        }}>
          Keyboard Shortcuts
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {SHORTCUT_ROWS.map((row) => (
            <div key={row.desc} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
              <span style={{ fontFamily: "var(--font-space-grotesk)", fontSize: 13, color: "#8892a8" }}>
                {row.desc}
              </span>
              <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                {row.keys.map((k) => (
                  <kbd key={k} style={{
                    fontFamily: "var(--font-jetbrains-mono)", fontSize: 11,
                    color: "#c9a55c", background: "rgba(201,165,92,0.1)",
                    border: "1px solid rgba(201,165,92,0.25)",
                    borderRadius: 5, padding: "2px 7px",
                  }}>{k}</kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{
            marginTop: 22, width: "100%", padding: "8px 0", borderRadius: 8,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
            fontFamily: "var(--font-space-grotesk)", fontSize: 13,
            color: "#8892a8", cursor: "pointer",
          }}
        >
          Đóng
        </button>
      </div>
    </div>
  );
}

export default function Workspace() {
  const chatRef = useRef<ChatPanelHandle>(null);
  const { user } = useAuth();
  const [convId, setConvId] = useState<string | null>(null);
  const [histRefresh, setHistRefresh] = useState(0);

  // Load conversation from ?cx= query param on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const cx = params.get("cx");
    if (cx) setConvId(cx);
  }, []);
  const [context, setContext] = useState<{ docIds: string[]; web: boolean }>({ docIds: [], web: true });
  const [openViewer, setOpenViewer] = useState<{ type: "report" | "doc"; id: string } | null>(null);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const [docs, setDocs] = useState<DocumentMeta[]>([]);
  const [docsHasMore, setDocsHasMore] = useState(false);
  const [docsLoadingMore, setDocsLoadingMore] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);

  // Panel state
  const bp = useBreakpoint();
  const [sidebarState, setSidebarState] = useState<PanelState>("open");

  // Mobile sidebar drawer
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const toggleSidebar = useCallback(() => {
    setSidebarState((s) => (s === "open" ? "collapsed" : "open"));
  }, []);

  // Keyboard shortcut [ — desktop only
  useEffect(() => {
    if (bp !== "desktop") return;
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "[") toggleSidebar();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [bp, toggleSidebar]);

  const loadDocs = useCallback(async () => {
    try {
      const res = await getDocuments(DOCS_PAGE_SIZE, 0);
      setDocs(res.documents);
      setDocsHasMore(res.has_more);
    } catch {
      setDocs([]);
      setDocsHasMore(false);
    }
  }, []);

  const loadMoreDocs = useCallback(() => {
    setDocs((prev) => {
      if (docsLoadingMore || !docsHasMore) return prev;
      setDocsLoadingMore(true);
      void getDocuments(DOCS_PAGE_SIZE, prev.length)
        .then((res) => {
          setDocs((cur) => [...cur, ...res.documents]);
          setDocsHasMore(res.has_more);
        })
        .finally(() => setDocsLoadingMore(false));
      return prev;
    });
  }, [docsLoadingMore, docsHasMore]);

  useEffect(() => {
    if (!openViewer && pendingQuestion) {
      chatRef.current?.injectPrompt(pendingQuestion);
      setPendingQuestion(null);
    }
  }, [openViewer, pendingQuestion]);

  const handleAskQuestion = (question: string) => {
    setPendingQuestion(question);
    setOpenViewer(null);
  };

  useEffect(() => { void loadDocs(); }, [loadDocs]);

  const toggleDoc = (id: string) =>
    setContext((c) => ({
      ...c,
      docIds: c.docIds.includes(id) ? c.docIds.filter((d) => d !== id) : [...c.docIds, id],
    }));

  const openViewer_ = (v: { type: "report" | "doc"; id: string }) => setOpenViewer(v);

  const userInitial = (user?.display_name ?? user?.email ?? "?")[0].toUpperCase();

  const sidebarContent = (
    <Sidebar
      activeConvId={convId}
      onSelectConv={(id) => setConvId(id)}
      historyRefreshKey={histRefresh}
      onNewConversation={() => setConvId(null)}
      docs={docs}
      docsHasMore={docsHasMore}
      onLoadMoreDocs={loadMoreDocs}
      selectedDocIds={context.docIds}
      onToggleDoc={toggleDoc}
      onDocsRefresh={loadDocs}
      onOpenDoc={(id) => openViewer_({ type: "doc", id })}
      onOpenReport={(id) => openViewer_({ type: "report", id })}
      onCollapse={bp !== "mobile" ? toggleSidebar : undefined}
      onOpenAccountModal={() => setShowAccountModal(true)}
    />
  );

  return (
    <>
      <Starfield />
      <WorkspaceShell
        sidebar={bp !== "mobile" ? sidebarContent : null}
        sidebarState={bp === "mobile" ? "hidden" : sidebarState}
        onToggleSidebar={toggleSidebar}
      >
        {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}

        {/* Mobile header — only on mobile */}
        {bp === "mobile" && (
          <MobileHeader
            onOpenSidebar={() => setMobileSidebarOpen(true)}
            onOpenAccountModal={() => setShowAccountModal(true)}
            userInitial={userInitial}
          />
        )}

        {openViewer ? (
          <ViewerOverlay
            viewer={openViewer}
            docs={docs}
            onClose={() => setOpenViewer(null)}
            onAskQuestion={handleAskQuestion}
          />
        ) : (
          <ChatPanel
            ref={chatRef}
            context={context}
            docs={docs}
            onToggleDoc={toggleDoc}
            onOpenViewer={openViewer_}
            conversationId={convId}
            onCreated={(id) => { setConvId(id); setHistRefresh((n) => n + 1); }}
            onActivity={() => {
              setHistRefresh((n) => n + 1);
            }}
          />
        )}
      </WorkspaceShell>

      {/* Mobile sidebar drawer */}
      {bp === "mobile" && (
        <DrawerOverlay
          open={mobileSidebarOpen}
          side="left"
          onClose={() => setMobileSidebarOpen(false)}
        >
          {sidebarContent}
        </DrawerOverlay>
      )}

      {/* Account + Usage modal */}
      {showAccountModal && (
        <AccountModal
          onClose={() => setShowAccountModal(false)}
          docsCount={docs.length}
          histRefreshKey={histRefresh}
        />
      )}
    </>
  );
}
