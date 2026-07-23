"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import DocumentSidebar from "@/components/notebook/DocumentSidebar";
import HistoryList from "@/components/workspace/HistoryList";
import { deleteReport, getReports, renameReport, type DocumentMeta, type ReportSummary } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useTranslation } from "@/lib/i18n/LanguageProvider";

interface SidebarProps {
  activeConvId?: string | null;
  onSelectConv?: (id: string) => void;
  historyRefreshKey?: number;
  onNewConversation?: () => void;
  docs?: DocumentMeta[];
  docsHasMore?: boolean;
  onLoadMoreDocs?: () => void;
  selectedDocIds?: string[];
  onToggleDoc?: (id: string) => void;
  onDocsRefresh?: () => void;
  onOpenDoc?: (id: string) => void;
  onOpenReport?: (id: string) => void;
  onCollapse?: () => void;
  onOpenAccountModal?: () => void;
}

type Tab = "chats" | "docs" | "reports";

const REPORTS_PAGE_SIZE = 10;

function AstroLogoSidebar() {
  return (
    <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="3.5" fill="#c9a55c" />
      <circle cx="16" cy="16" r="8" stroke="#c9a55c" strokeWidth="0.7" opacity="0.4" />
      <circle cx="16" cy="16" r="13" stroke="#c9a55c" strokeWidth="0.4" opacity="0.18" />
      <circle cx="7" cy="9" r="1.3" fill="#ede8df" opacity="0.6" />
      <circle cx="25" cy="11" r="1" fill="#ede8df" opacity="0.5" />
      <circle cx="9" cy="24" r="1.1" fill="#ede8df" opacity="0.55" />
      <circle cx="24" cy="22" r="0.9" fill="#ede8df" opacity="0.45" />
      <line x1="7" y1="9" x2="16" y2="16" stroke="#ede8df" strokeWidth="0.4" opacity="0.28" />
      <line x1="25" y1="11" x2="16" y2="16" stroke="#ede8df" strokeWidth="0.4" opacity="0.28" />
      <line x1="9" y1="24" x2="16" y2="16" stroke="#ede8df" strokeWidth="0.4" opacity="0.28" />
      <line x1="24" y1="22" x2="16" y2="16" stroke="#ede8df" strokeWidth="0.4" opacity="0.28" />
      <line x1="7" y1="9" x2="9" y2="24" stroke="#ede8df" strokeWidth="0.3" opacity="0.14" />
      <line x1="25" y1="11" x2="24" y2="22" stroke="#ede8df" strokeWidth="0.3" opacity="0.14" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="7" cy="7" r="5" /><line x1="11" y1="11" x2="14" y2="14" />
    </svg>
  );
}

function fmtDate(iso: string, locale: string, labels: { today: string; yesterday: string }): string {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return labels.today;
  if (d === 1) return labels.yesterday;
  if (d < 7) return new Date(iso).toLocaleDateString(locale, { weekday: "short" });
  return new Date(iso).toLocaleDateString(locale, { month: "short", day: "numeric" });
}

function ReportItem({
  id, title, date, reportType, onClick, onDeleted, onRenamed,
}: {
  id: string; title: string; date: string; reportType?: string;
  onClick?: () => void;
  onDeleted: () => void;
  onRenamed: (title: string) => void;
}) {
  const { t, locale } = useTranslation();
  const s = t("sidebar");
  const [hovered, setHovered] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameVal, setRenameVal] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (renaming) inputRef.current?.select(); }, [renaming]);

  async function commitRename() {
    const t = renameVal.trim();
    setRenaming(false);
    if (t && t !== title) {
      await renameReport(id, t);
      onRenamed(t);
    } else {
      setRenameVal(title);
    }
  }

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    await deleteReport(id);
    onDeleted();
  }

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", flexDirection: "column", gap: 4,
        width: "100%", padding: "9px 10px", borderRadius: 8,
        background: hovered ? "rgba(255,255,255,0.03)" : "transparent",
        borderLeft: "2px solid transparent",
        transition: "background 0.15s", position: "relative",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div
          style={{ cursor: "pointer" }}
          onClick={onClick}
        >
          <div style={{
            width: 26, height: 26, borderRadius: 6, flexShrink: 0,
            background: "rgba(34,197,94,0.1)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="#22c55e" strokeWidth="1.3" strokeLinecap="round">
              <path d="M9 1H4a1.5 1.5 0 00-1.5 1.5v9A1.5 1.5 0 004 13h6a1.5 1.5 0 001.5-1.5V4L9 1z" />
              <polyline points="9,1 9,4 11.5,4" opacity="0.5" />
              <line x1="5" y1="7.5" x2="9" y2="7.5" /><line x1="5" y1="9.5" x2="7.5" y2="9.5" />
            </svg>
          </div>
        </div>

        {renaming ? (
          <input
            ref={inputRef}
            value={renameVal}
            onChange={(e) => setRenameVal(e.target.value)}
            onBlur={() => void commitRename()}
            onKeyDown={(e) => {
              if (e.key === "Enter") void commitRename();
              if (e.key === "Escape") { setRenaming(false); setRenameVal(title); }
            }}
            onClick={(e) => e.stopPropagation()}
            style={{
              flex: 1, background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(34,197,94,0.4)", borderRadius: 4,
              padding: "2px 6px", outline: "none",
              fontFamily: "var(--font-space-grotesk)", fontSize: 12, color: "#ede8df",
            }}
          />
        ) : (
          <span
            onClick={onClick}
            onDoubleClick={(e) => { e.stopPropagation(); setRenaming(true); }}
            style={{
              flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              fontFamily: "var(--font-space-grotesk)", fontSize: 13, fontWeight: 400,
              color: "#8892a8", lineHeight: 1.4, cursor: "pointer",
            }}
          >
            {title}
          </span>
        )}

        {hovered && !renaming && (
          <button
            type="button"
            onClick={(e) => void handleDelete(e)}
            title={t("common").delete}
            style={{
              flexShrink: 0, width: 20, height: 20, borderRadius: 4,
              background: "rgba(248,113,113,0.1)",
              border: "1px solid rgba(248,113,113,0.2)",
              color: "#f87171", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(248,113,113,0.2)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(248,113,113,0.1)"; }}
          >
            <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="3" y1="3" x2="9" y2="9" /><line x1="9" y1="3" x2="3" y2="9" />
            </svg>
          </button>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 5, paddingLeft: 34 }}>
        <span style={{
          fontFamily: "var(--font-jetbrains-mono)", fontSize: 9,
          color: "#22c55e", background: "rgba(34,197,94,0.1)",
          borderRadius: 3, padding: "1px 5px",
        }}>
          {s.reportTypes[(reportType ?? "research") as keyof typeof s.reportTypes] ?? s.reportTypes.research}
        </span>
        <span style={{ flex: 1 }} />
        <span style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: 9, color: "#4a5568" }}>
          {fmtDate(date, locale, s.dateLabels)}
        </span>
      </div>
    </div>
  );
}

export default function Sidebar({
  activeConvId = null,
  onSelectConv,
  historyRefreshKey = 0,
  onNewConversation,
  docs = [],
  docsHasMore = false,
  onLoadMoreDocs,
  selectedDocIds = [],
  onToggleDoc,
  onDocsRefresh,
  onOpenDoc,
  onOpenReport,
  onCollapse,
  onOpenAccountModal,
}: SidebarProps) {
  const { user } = useAuth();
  const { locale, setLocale, t } = useTranslation();
  const s = t("sidebar");
  const [tab, setTab] = useState<Tab>("chats");
  const [search, setSearch] = useState("");
  const [reportSearch, setReportSearch] = useState("");
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [reportsHasMore, setReportsHasMore] = useState(false);
  const [reportsLoadingMore, setReportsLoadingMore] = useState(false);
  const reportsSentinelRef = useRef<HTMLDivElement>(null);

  const loadReports = useCallback(() => {
    void getReports(REPORTS_PAGE_SIZE, 0)
      .then((d) => {
        setReports(d.reports);
        setReportsHasMore(d.has_more);
      })
      .catch(() => {
        setReports([]);
        setReportsHasMore(false);
      });
  }, []);

  useEffect(() => {
    loadReports();
  }, [tab, loadReports, historyRefreshKey]);

  const loadMoreReports = useCallback(() => {
    setReports((prev) => {
      if (reportsLoadingMore || !reportsHasMore) return prev;
      setReportsLoadingMore(true);
      void getReports(REPORTS_PAGE_SIZE, prev.length)
        .then((d) => {
          setReports((cur) => [...cur, ...d.reports]);
          setReportsHasMore(d.has_more);
        })
        .finally(() => setReportsLoadingMore(false));
      return prev;
    });
  }, [reportsLoadingMore, reportsHasMore]);

  useEffect(() => {
    if (tab !== "reports") return;
    const el = reportsSentinelRef.current;
    if (!el || !reportsHasMore) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMoreReports(); },
      { rootMargin: "100px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [tab, reportsHasMore, loadMoreReports]);

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "chats", label: s.tabs.chats },
    { key: "docs", label: s.tabs.docs, count: docs.length },
    { key: "reports", label: s.tabs.reports, count: reports.length },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "rgba(6,10,20,0.97)" }}>

      {/* Logo bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "10px 12px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, flex: 1, minWidth: 0 }}>
          <AstroLogoSidebar />
          <span style={{ fontFamily: "var(--font-instrument-serif)", fontSize: 17, color: "#ede8df" }}>
            Astro Mind
          </span>
        </div>
        {/* New Chat */}
        <button
          type="button"
          onClick={onNewConversation}
          title={s.newChat}
          style={{
            width: 28, height: 28, borderRadius: 7,
            background: "#c9a55c", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#060a14", flexShrink: 0,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <line x1="7" y1="2" x2="7" y2="12" /><line x1="2" y1="7" x2="12" y2="7" />
          </svg>
        </button>
        {/* Collapse */}
        {onCollapse && (
          <button
            type="button"
            onClick={onCollapse}
            title={s.collapse}
            style={{
              width: 28, height: 28, borderRadius: 7, flexShrink: 0,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#4a5568", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(201,165,92,0.3)"; e.currentTarget.style.color = "#c9a55c"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "#4a5568"; }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <polyline points="7,2 3,6 7,10" />
            </svg>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{
        display: "flex", borderBottom: "1px solid rgba(255,255,255,0.06)",
        flexShrink: 0,
      }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            style={{
              flex: 1, padding: "9px 0", textAlign: "center",
              fontFamily: "var(--font-jetbrains-mono)", fontSize: 9, fontWeight: 500,
              letterSpacing: "0.08em", textTransform: "uppercase" as const,
              color: tab === t.key ? "#c9a55c" : "#4a5568",
              background: "transparent",
              border: "none",
              borderBottom: tab === t.key ? "2px solid #c9a55c" : "2px solid transparent",
              cursor: "pointer", transition: "all 0.18s",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
            }}
          >
            {t.label}
            {t.count !== undefined && (
              <span style={{
                fontFamily: "var(--font-jetbrains-mono)", fontSize: 9,
                color: tab === t.key ? "#c9a55c" : "#4a5568", opacity: 0.7,
              }}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search (chats only) */}
      {tab === "chats" && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "8px 12px",
          borderBottom: "1px solid rgba(255,255,255,0.04)",
          background: "rgba(255,255,255,0.01)",
          flexShrink: 0,
        }}>
          <span style={{ color: "#4a5568", display: "flex" }}><SearchIcon /></span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={s.searchChats}
            style={{
              flex: 1, background: "none", border: "none", outline: "none",
              fontFamily: "var(--font-space-grotesk)", fontSize: 12, color: "#ede8df",
            }}
          />
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
        {tab === "chats" && (
          <div style={{ padding: "8px 8px" }}>
            <HistoryList
              activeId={activeConvId}
              onSelect={onSelectConv ?? (() => {})}
              refreshKey={historyRefreshKey}
              filter={search}
            />
          </div>
        )}

        {tab === "docs" && (
          <div style={{ padding: "8px" }}>
            <DocumentSidebar
              documents={docs}
              onIngested={onDocsRefresh ?? (() => {})}
              selectedIds={selectedDocIds}
              onToggleDoc={onToggleDoc}
              onOpenDoc={onOpenDoc}
              headingHidden
              hasMore={docsHasMore}
              onLoadMore={onLoadMoreDocs}
            />
          </div>
        )}

        {tab === "reports" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 2, padding: "8px" }}>
            {/* Search */}
            {reports.length > 0 && (
              <div style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 10px", borderRadius: 7, marginBottom: 4,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}>
                <span style={{ color: "#4a5568", display: "flex", flexShrink: 0 }}><SearchIcon /></span>
                <input
                  value={reportSearch}
                  onChange={(e) => setReportSearch(e.target.value)}
                  placeholder={s.searchReports}
                  style={{
                    flex: 1, background: "none", border: "none", outline: "none",
                    fontFamily: "var(--font-space-grotesk)", fontSize: 12, color: "#ede8df",
                  }}
                />
                {reportSearch && (
                  <button
                    type="button"
                    onClick={() => setReportSearch("")}
                    style={{ background: "none", border: "none", color: "#4a5568", cursor: "pointer", padding: 0, lineHeight: 1 }}
                  >
                    ×
                  </button>
                )}
              </div>
            )}

            {reports.length === 0 && (
              <p style={{
                padding: "16px 10px", textAlign: "center", fontSize: 12,
                color: "#4a5568", fontFamily: "var(--font-space-grotesk)",
              }}>
                {s.noReports}
              </p>
            )}

            {(() => {
              const q = reportSearch.toLowerCase();
              const filtered = q ? reports.filter((r) => r.title.toLowerCase().includes(q)) : reports;
              if (reports.length > 0 && filtered.length === 0) {
                return (
                  <p style={{ padding: "12px 10px", textAlign: "center", fontSize: 12, color: "#4a5568", fontFamily: "var(--font-space-grotesk)" }}>
                    {s.noResultsFor} &ldquo;{reportSearch}&rdquo;
                  </p>
                );
              }
              return filtered.map((r) => (
                <ReportItem
                  key={r.id}
                  id={r.id}
                  title={r.title}
                  date={r.created_at}
                  reportType={r.report_type}
                  onClick={() => onOpenReport?.(r.id)}
                  onDeleted={() => setReports((prev) => prev.filter((x) => x.id !== r.id))}
                  onRenamed={(title) => setReports((prev) => prev.map((x) => x.id === r.id ? { ...x, title } : x))}
                />
              ));
            })()}
            {reportsHasMore && (
              <div ref={reportsSentinelRef} style={{ height: 1 }} />
            )}
          </div>
        )}
      </div>

      {/* Language toggle */}
      <div style={{
        borderTop: "1px solid rgba(255,255,255,0.06)",
        padding: "8px 14px",
        display: "flex", justifyContent: "center",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", gap: 2 }}>
          {(["vi", "en", "ja"] as const).map((loc) => (
            <button
              key={loc}
              type="button"
              onClick={() => setLocale(loc)}
              title={s.language}
              style={{
                fontFamily: "var(--font-jetbrains-mono)", fontSize: 9, letterSpacing: "0.06em",
                color: locale === loc ? "var(--aurora-cyan)" : "#8892a8",
                background: locale === loc ? "rgba(201,165,92,0.1)" : "transparent",
                border: locale === loc ? "1px solid rgba(201,165,92,0.25)" : "1px solid transparent",
                borderRadius: 5, padding: "3px 7px", cursor: "pointer",
                textTransform: "uppercase",
              }}
            >
              {loc}
            </button>
          ))}
        </div>
      </div>

      {/* User profile footer */}
      <button
        type="button"
        onClick={onOpenAccountModal}
        title={s.accountUsage}
        style={{
          borderTop: "1px solid rgba(255,255,255,0.06)",
          padding: "10px 14px",
          display: "flex", alignItems: "center", gap: 10,
          flexShrink: 0, width: "100%",
          background: "transparent", border: "none",
          cursor: onOpenAccountModal ? "pointer" : "default",
          transition: "background 0.15s",
          textAlign: "left",
        }}
        onMouseEnter={(e) => { if (onOpenAccountModal) e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
      >
        <div style={{
          width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
          background: "linear-gradient(135deg, #c9a55c, #a67c42)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "var(--font-space-grotesk)", fontSize: 13, fontWeight: 700,
          color: "#060a14",
        }}>
          {(user?.display_name ?? user?.email ?? "?")[0].toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: "var(--font-space-grotesk)", fontSize: 13, fontWeight: 600,
            color: "#ede8df", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {user?.display_name ?? user?.email?.split("@")[0] ?? "User"}
          </div>
          <div style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: 9, color: "#c9a55c", letterSpacing: "0.05em" }}>
            {user?.plan === "pro" ? s.plan.pro : user?.plan === "team" ? s.plan.team : s.plan.free}
          </div>
        </div>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#4a5568" strokeWidth="1.5" strokeLinecap="round" style={{ flexShrink: 0 }}>
          <polyline points="5,2 9,6 5,10" />
        </svg>
      </button>
    </div>
  );
}
