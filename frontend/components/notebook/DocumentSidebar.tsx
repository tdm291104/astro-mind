"use client";

import { useEffect, useRef, useState } from "react";

import {
  deleteDocument,
  getIngestStatus,
  ingestFile,
  ingestUrl,
  renameDocument,
  type DocumentMeta,
} from "@/lib/api";

const TYPE_COLOR: Record<string, { color: string; bg: string; label: string }> = {
  pdf:  { color: "#f87171", bg: "rgba(248,113,113,0.12)", label: "PDF"  },
  docx: { color: "#60a5fa", bg: "rgba(96,165,250,0.12)",  label: "DOC"  },
  fits: { color: "#a78bfa", bg: "rgba(167,139,250,0.12)", label: "FITS" },
  url:  { color: "#34d399", bg: "rgba(52,211,153,0.12)",  label: "URL"  },
  text: { color: "#94a3b8", bg: "rgba(148,163,184,0.12)", label: "TXT"  },
};

function FileIcon({ type }: { type: string }) {
  const c = TYPE_COLOR[type] ?? TYPE_COLOR.text;
  return (
    <div style={{
      width: 28, height: 28, borderRadius: 6, flexShrink: 0,
      background: c.bg, display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke={c.color} strokeWidth="1.3" strokeLinecap="round">
        <path d="M9 1H4a1.5 1.5 0 00-1.5 1.5v9A1.5 1.5 0 004 13h6a1.5 1.5 0 001.5-1.5V4L9 1z" />
        <polyline points="9,1 9,4 11.5,4" opacity="0.5" />
      </svg>
    </div>
  );
}

function UploadIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <path d="M7 10V2" /><path d="M3 6l4-4 4 4" />
      <rect x="1.5" y="10" width="11" height="3" rx="1" opacity="0.35" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <path d="M5.5 8.5a3.5 3.5 0 005 0l2-2a3.5 3.5 0 00-5-5L6 3" />
      <path d="M8.5 5.5a3.5 3.5 0 00-5 0l-2 2a3.5 3.5 0 005 5L8 11" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="7" cy="7" r="5" /><line x1="11" y1="11" x2="14" y2="14" />
    </svg>
  );
}

export default function DocumentSidebar({
  documents,
  onIngested,
  pollMs = 1500,
  selectedIds = [],
  onToggleDoc,
  onOpenDoc,
  headingHidden,
  hasMore,
  onLoadMore,
}: {
  documents: DocumentMeta[];
  onIngested: () => void;
  pollMs?: number;
  selectedIds?: string[];
  onToggleDoc?: (id: string) => void;
  onOpenDoc?: (id: string) => void;
  headingHidden?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
}) {
  const [url, setUrl] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const renameRef = useRef<HTMLInputElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (renamingId && renameRef.current) renameRef.current.select();
  }, [renamingId]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore || !onLoadMore) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) onLoadMore(); },
      { rootMargin: "100px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, onLoadMore]);

  async function addFile(file: File) {
    setError(null);
    try {
      const started = await ingestFile(file);
      setJobId(started.job_id);
      setStatus("Processing…");
      setShowAdd(false);
    } catch {
      setError("Upload failed");
    }
  }

  async function addUrl() {
    const u = url.trim();
    if (!u) return;
    setError(null);
    try {
      const started = await ingestUrl(u);
      setJobId(started.job_id);
      setStatus("Processing…");
      setUrl("");
      setShowAdd(false);
    } catch {
      setError("Failed to fetch URL");
    }
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    await deleteDocument(id);
    onIngested(); // triggers parent refresh
  }

  async function commitRename(id: string) {
    const name = renameValue.trim();
    setRenamingId(null);
    if (name) {
      await renameDocument(id, name);
      onIngested();
    }
  }

  useEffect(() => {
    if (!jobId) return;
    const id = setInterval(async () => {
      try {
        const job = await getIngestStatus(jobId);
        if (job.status === "done") {
          clearInterval(id); setJobId(null); setStatus(null); onIngested();
        } else if (job.status === "failed") {
          clearInterval(id); setJobId(null); setStatus(null);
          setError(job.error ?? "Processing failed");
        } else {
          setStatus(`Processing ${job.source_name}…`);
        }
      } catch {
        clearInterval(id); setJobId(null); setStatus(null);
        setError("Connection lost");
      }
    }, pollMs);
    return () => clearInterval(id);
  }, [jobId, pollMs, onIngested]);

  const q = search.toLowerCase();
  const filtered = q
    ? documents.filter((d) => d.name.toLowerCase().includes(q))
    : documents;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {!headingHidden && (
        <div style={{
          fontFamily: "var(--font-jetbrains-mono)", fontSize: 9, fontWeight: 500,
          color: "#4a5568", letterSpacing: "0.08em", textTransform: "uppercase" as const,
          padding: "0 4px 8px",
        }}>
          Documents
        </div>
      )}

      {/* Search */}
      {documents.length > 0 && (
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "6px 10px", borderRadius: 7, marginBottom: 4,
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}>
          <span style={{ color: "#4a5568", display: "flex", flexShrink: 0 }}><SearchIcon /></span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search docs..."
            style={{
              flex: 1, background: "none", border: "none", outline: "none",
              fontFamily: "var(--font-space-grotesk)", fontSize: 12, color: "#ede8df",
            }}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              style={{ background: "none", border: "none", color: "#4a5568", cursor: "pointer", padding: 0, lineHeight: 1 }}
            >
              ×
            </button>
          )}
        </div>
      )}

      {/* Add source button */}
      <button
        type="button"
        onClick={() => setShowAdd((p) => !p)}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "8px 10px", borderRadius: 8,
          background: showAdd ? "rgba(201,165,92,0.08)" : "rgba(255,255,255,0.03)",
          border: `1px solid ${showAdd ? "rgba(201,165,92,0.2)" : "rgba(255,255,255,0.06)"}`,
          color: showAdd ? "#c9a55c" : "#4a5568",
          cursor: "pointer", transition: "all 0.15s",
          fontFamily: "var(--font-space-grotesk)", fontSize: 12,
          width: "100%", textAlign: "left",
          marginBottom: 4,
        }}
      >
        <span style={{ display: "flex" }}><UploadIcon /></span>
        Add source
        <span style={{ marginLeft: "auto", fontSize: 14, lineHeight: 1, opacity: 0.7 }}>
          {showAdd ? "−" : "+"}
        </span>
      </button>

      {/* Add source panel */}
      {showAdd && (
        <div style={{
          padding: "10px 12px",
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 8, marginBottom: 8,
          display: "flex", flexDirection: "column", gap: 8,
        }}>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 10px", borderRadius: 7,
              background: "rgba(255,255,255,0.03)",
              border: "1px dashed rgba(255,255,255,0.1)",
              color: "#8892a8", cursor: "pointer", transition: "all 0.15s",
              fontFamily: "var(--font-space-grotesk)", fontSize: 12,
              width: "100%", textAlign: "left",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(201,165,92,0.3)";
              e.currentTarget.style.color = "#c9a55c";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
              e.currentTarget.style.color = "#8892a8";
            }}
          >
            <UploadIcon />
            Upload PDF, DOCX, FITS, TXT
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.docx,.fits,.txt,.md"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) { void addFile(file); e.target.value = ""; }
            }}
          />

          <div style={{ display: "flex", gap: 6 }}>
            <div style={{
              flex: 1, display: "flex", alignItems: "center", gap: 6,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 7, padding: "6px 10px",
            }}>
              <span style={{ color: "#4a5568", display: "flex" }}><LinkIcon /></span>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void addUrl(); }}
                placeholder="Paste URL..."
                style={{
                  flex: 1, background: "none", border: "none", outline: "none",
                  fontFamily: "var(--font-space-grotesk)", fontSize: 12, color: "#ede8df",
                }}
              />
            </div>
            <button
              type="button"
              onClick={() => void addUrl()}
              disabled={!url.trim()}
              style={{
                padding: "0 12px", borderRadius: 7,
                background: url.trim() ? "#c9a55c" : "rgba(255,255,255,0.06)",
                border: "none", color: url.trim() ? "#060a14" : "#4a5568",
                fontFamily: "var(--font-space-grotesk)", fontSize: 12, fontWeight: 600,
                cursor: url.trim() ? "pointer" : "default", transition: "all 0.2s",
              }}
            >
              Add
            </button>
          </div>
        </div>
      )}

      {status && (
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          fontFamily: "var(--font-jetbrains-mono)", fontSize: 10, color: "#c9a55c",
          padding: "6px 10px",
          background: "rgba(201,165,92,0.06)",
          border: "1px solid rgba(201,165,92,0.12)",
          borderRadius: 7,
          marginBottom: 4,
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: "50%", background: "#c9a55c",
            animation: "pulsar 1.2s ease-out infinite",
            display: "inline-block",
            flexShrink: 0,
          }} />
          {status}
        </div>
      )}
      {error && (
        <div style={{
          fontFamily: "var(--font-space-grotesk)", fontSize: 11, color: "#f87171",
          background: "rgba(248,113,113,0.08)", borderRadius: 6, padding: "6px 10px",
          marginBottom: 4,
        }}>
          {error}
        </div>
      )}

      {/* Empty states */}
      {documents.length === 0 && !showAdd && (
        <p style={{
          padding: "16px 10px", fontSize: 12, color: "#4a5568",
          fontFamily: "var(--font-space-grotesk)", textAlign: "center",
        }}>
          No documents yet
        </p>
      )}
      {documents.length > 0 && filtered.length === 0 && (
        <p style={{
          padding: "12px 10px", fontSize: 12, color: "#4a5568",
          fontFamily: "var(--font-space-grotesk)", textAlign: "center",
        }}>
          No results for &ldquo;{search}&rdquo;
        </p>
      )}

      {/* Document list */}
      {filtered.map((doc) => {
        const isSelected = selectedIds.includes(doc.id);
        const isHovered = hoveredId === doc.id;
        const isRenaming = renamingId === doc.id;
        const meta = TYPE_COLOR[doc.type] ?? TYPE_COLOR.text;

        return (
          <div
            key={doc.id}
            onMouseEnter={() => setHoveredId(doc.id)}
            onMouseLeave={() => setHoveredId(null)}
            style={{
              display: "flex", alignItems: "center", gap: 9,
              padding: "8px 10px", borderRadius: 8,
              background: isSelected
                ? "rgba(201,165,92,0.06)"
                : isHovered ? "rgba(255,255,255,0.03)" : "transparent",
              borderLeft: `2px solid ${isSelected ? "rgba(201,165,92,0.4)" : "transparent"}`,
              cursor: "pointer", transition: "all 0.15s",
            }}
          >
            {onToggleDoc && (
              <div
                onClick={() => onToggleDoc(doc.id)}
                style={{
                  width: 15, height: 15, borderRadius: 4, flexShrink: 0,
                  border: `1.5px solid ${isSelected ? "#c9a55c" : "rgba(255,255,255,0.15)"}`,
                  background: isSelected ? "rgba(201,165,92,0.15)" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.15s", cursor: "pointer",
                }}
              >
                {isSelected && (
                  <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="#c9a55c" strokeWidth="1.8" strokeLinecap="round">
                    <polyline points="2,5 4.5,7.5 8,3" />
                  </svg>
                )}
              </div>
            )}

            <FileIcon type={doc.type} />

            <div style={{ flex: 1, minWidth: 0 }}>
              {isRenaming ? (
                <input
                  ref={renameRef}
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={() => void commitRename(doc.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void commitRename(doc.id);
                    if (e.key === "Escape") setRenamingId(null);
                  }}
                  style={{
                    width: "100%", background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(201,165,92,0.4)", borderRadius: 4,
                    padding: "2px 6px", outline: "none",
                    fontFamily: "var(--font-space-grotesk)", fontSize: 12, color: "#ede8df",
                  }}
                />
              ) : (
                <div
                  style={{ cursor: onOpenDoc ? "pointer" : "default" }}
                  onClick={() => onOpenDoc?.(doc.id)}
                  onDoubleClick={() => { setRenamingId(doc.id); setRenameValue(doc.name); }}
                >
                  <div style={{
                    fontFamily: "var(--font-space-grotesk)", fontSize: 12, fontWeight: 500,
                    color: isSelected ? "#ede8df" : "#8892a8",
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    lineHeight: 1.4,
                  }}>
                    {doc.name}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
                    <span style={{
                      fontFamily: "var(--font-jetbrains-mono)", fontSize: 9,
                      color: meta.color, background: meta.bg,
                      borderRadius: 3, padding: "1px 5px",
                    }}>
                      {meta.label}
                    </span>
                    {doc.page_count > 0 && (
                      <span style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: 9, color: "#4a5568" }}>
                        {doc.page_count}p
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Delete button — visible on hover */}
            {isHovered && !isRenaming && (
              <button
                type="button"
                onClick={(e) => void handleDelete(doc.id, e)}
                title="Delete"
                style={{
                  flexShrink: 0, width: 22, height: 22, borderRadius: 5,
                  background: "rgba(248,113,113,0.1)",
                  border: "1px solid rgba(248,113,113,0.2)",
                  color: "#f87171", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(248,113,113,0.2)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(248,113,113,0.1)"; }}
              >
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <line x1="3" y1="3" x2="9" y2="9" /><line x1="9" y1="3" x2="3" y2="9" />
                </svg>
              </button>
            )}
          </div>
        );
      })}
      {hasMore && !search && (
        <div ref={sentinelRef} style={{ height: 1 }} />
      )}
    </div>
  );
}
