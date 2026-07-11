"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  deleteConversation,
  getConversations,
  renameConversation,
  type ConversationSummary,
} from "@/lib/api";

interface Props {
  activeId: string | null;
  onSelect: (id: string) => void;
  refreshKey: number;
  filter?: string;
}

const PAGE_SIZE = 10;

function fmtTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "now";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "Yesterday";
  return new Date(iso).toLocaleDateString("en", { month: "short", day: "numeric" });
}

const AGENT_CHIPS: Record<string, { name: string; color: string; bg: string }> = {
  ChatAgent:     { name: "Chat Agent",     color: "#c9a55c", bg: "rgba(201,165,92,0.13)"    },
  SearchAgent:   { name: "Search Agent",   color: "#5b8def", bg: "rgba(91,141,239,0.13)"    },
  NotebookAgent: { name: "Notebook Agent", color: "#22c55e", bg: "rgba(34,197,94,0.13)"     },
  ReportAgent:   { name: "Report Agent",   color: "#a78bfa", bg: "rgba(167,139,250,0.13)"   },
  ImageAgent:    { name: "Image Agent",    color: "#06b6d4", bg: "rgba(6,182,212,0.13)"     },
};

const ROUTE_TO_AGENT: Record<string, string> = {
  chat:                   "ChatAgent",
  notebook_fallback_chat: "ChatAgent",
  notebook:               "NotebookAgent",
  search:                 "SearchAgent",
  search_web:             "SearchAgent",
  report:                 "ReportAgent",
  image:                  "ImageAgent",
};

function getAgentChips(routes: string[]): Array<{ name: string; color: string; bg: string }> {
  const seen = new Set<string>();
  const chips: Array<{ name: string; color: string; bg: string }> = [];
  for (const r of routes) {
    const agentName = ROUTE_TO_AGENT[r];
    if (agentName && !seen.has(agentName)) {
      seen.add(agentName);
      chips.push(AGENT_CHIPS[agentName]);
    }
  }
  return chips.slice(0, 3);
}

export default function HistoryList({ activeId, onSelect, refreshKey, filter = "" }: Props) {
  const [items, setItems] = useState<ConversationSummary[] | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameRef = useRef<HTMLInputElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    void getConversations(PAGE_SIZE, 0)
      .then((res) => {
        setItems(res.conversations);
        setHasMore(res.has_more);
      })
      .catch(() => {
        setItems([]);
        setHasMore(false);
      });
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  const loadMore = useCallback(() => {
    setItems((prev) => {
      if (!prev || loadingMore || !hasMore) return prev;
      setLoadingMore(true);
      void getConversations(PAGE_SIZE, prev.length)
        .then((res) => {
          setItems((cur) => (cur ? [...cur, ...res.conversations] : res.conversations));
          setHasMore(res.has_more);
        })
        .finally(() => setLoadingMore(false));
      return prev;
    });
  }, [loadingMore, hasMore]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { rootMargin: "100px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  useEffect(() => {
    if (renamingId && renameRef.current) renameRef.current.select();
  }, [renamingId]);

  async function remove(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    await deleteConversation(id);
    load();
  }

  async function commitRename(id: string) {
    const title = renameValue.trim();
    setRenamingId(null);
    if (!title) return;
    await renameConversation(id, title);
    setItems((prev) =>
      prev ? prev.map((c) => (c.id === id ? { ...c, title } : c)) : prev
    );
  }

  function startRename(e: React.MouseEvent, c: ConversationSummary) {
    e.stopPropagation();
    setRenamingId(c.id);
    setRenameValue(c.title);
  }

  const filtered = filter
    ? (items ?? []).filter((c) => c.title.toLowerCase().includes(filter.toLowerCase()))
    : (items ?? []);

  if (items && filtered.length === 0) {
    return (
      <p style={{ padding: "16px 12px", fontSize: 12, color: "#4a5568", fontFamily: "var(--font-space-grotesk)" }}>
        {filter ? "No results found" : "No conversations yet"}
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {filtered.map((c) => {
        const isActive = c.id === activeId;
        const isHovered = hoveredId === c.id;
        const isRenaming = renamingId === c.id;
        const chips = getAgentChips(c.routes ?? []);

        return (
          <div
            key={c.id}
            onMouseEnter={() => setHoveredId(c.id)}
            onMouseLeave={() => setHoveredId(null)}
            onClick={() => { if (!isRenaming) onSelect(c.id); }}
            style={{
              display: "flex", flexDirection: "column", gap: 5,
              width: "100%", cursor: isRenaming ? "default" : "pointer",
              padding: "9px 10px", borderRadius: 8,
              background: isActive
                ? "rgba(201,165,92,0.07)"
                : isHovered ? "rgba(255,255,255,0.03)" : "transparent",
              borderLeft: `2px solid ${isActive ? "#c9a55c" : "transparent"}`,
              transition: "background 0.15s, border-color 0.15s",
            }}
          >
            {/* Title row */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {isRenaming ? (
                <input
                  ref={renameRef}
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={() => void commitRename(c.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void commitRename(c.id);
                    if (e.key === "Escape") setRenamingId(null);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    flex: 1, background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(201,165,92,0.4)", borderRadius: 4,
                    padding: "2px 6px", outline: "none",
                    fontFamily: "var(--font-space-grotesk)", fontSize: 13, color: "#ede8df",
                  }}
                />
              ) : (
                <span
                  onDoubleClick={(e) => startRename(e, c)}
                  style={{
                    flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    fontFamily: "var(--font-space-grotesk)", fontSize: 13, fontWeight: isActive ? 500 : 400,
                    color: isActive ? "#ede8df" : "#8892a8",
                    lineHeight: 1.4,
                  }}
                >
                  {c.title}
                </span>
              )}

              {isHovered && !isRenaming && (
                <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
                  {/* Rename button */}
                  <span
                    role="button"
                    aria-label="Rename"
                    onClick={(e) => startRename(e, c)}
                    title="Rename (or double-click)"
                    style={{
                      fontSize: 11, color: "#4a5568", lineHeight: 1,
                      padding: "2px 3px", cursor: "pointer", transition: "color 0.15s",
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#c9a55c"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#4a5568"; }}
                  >
                    ✎
                  </span>
                  {/* Delete button */}
                  <span
                    role="button"
                    aria-label="Delete"
                    onClick={(e) => void remove(e, c.id)}
                    style={{
                      fontSize: 10, color: "#4a5568", lineHeight: 1,
                      padding: "2px 3px", cursor: "pointer", transition: "color 0.15s",
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#f87171"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#4a5568"; }}
                  >
                    ✕
                  </span>
                </div>
              )}
            </div>

            {/* Chips + timestamp row */}
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {chips.map((chip) => (
                <span key={chip.name} style={{
                  fontFamily: "var(--font-jetbrains-mono)", fontSize: 9,
                  color: chip.color, background: chip.bg,
                  borderRadius: 4, padding: "2px 6px",
                  letterSpacing: "0.02em", lineHeight: 1.4,
                }}>
                  {chip.name}
                </span>
              ))}
              <span style={{ flex: 1 }} />
              <span style={{
                fontFamily: "var(--font-jetbrains-mono)", fontSize: 9,
                color: "#4a5568", flexShrink: 0,
              }}>
                {fmtTime(c.updated_at)}
              </span>
            </div>
          </div>
        );
      })}
      {hasMore && (
        <div ref={sentinelRef} style={{ height: 1 }} />
      )}
    </div>
  );
}
