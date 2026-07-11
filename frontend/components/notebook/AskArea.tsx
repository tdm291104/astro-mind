"use client";

import { useState } from "react";

import { ask, type AskResult, type Citation } from "@/lib/api";

function CitationCard({ c }: { c: Citation }) {
  return (
    <div style={{
      padding: "10px 14px",
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 10,
      marginTop: 8,
    }}>
      <div style={{ fontFamily: "var(--font-space-grotesk)", fontSize: 11, color: "#c9a55c", marginBottom: 4 }}>
        {c.doc_name}{c.page != null ? ` · trang ${c.page}` : ""}{c.section ? ` · ${c.section}` : ""}
      </div>
      <div style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: 11, color: "#8892a8", lineHeight: 1.5 }}>
        {c.excerpt}
      </div>
    </div>
  );
}

export default function AskArea({ docIds }: { docIds?: string[] }) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<AskResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAsk() {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = docIds ? await ask(q, docIds) : await ask(q);
      setResult(r);
    } catch {
      setError("Đã xảy ra lỗi. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !loading && void handleAsk()}
          placeholder="Đặt câu hỏi về tài liệu…"
          style={{
            flex: 1,
            fontFamily: "var(--font-space-grotesk)",
            fontSize: 13,
            color: "#ede8df",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 10,
            padding: "10px 14px",
            outline: "none",
          }}
        />
        <button
          type="button"
          onClick={() => void handleAsk()}
          disabled={loading || !query.trim()}
          style={{
            fontFamily: "var(--font-space-grotesk)",
            fontSize: 13,
            fontWeight: 600,
            color: "#060a14",
            background: loading ? "rgba(201,165,92,0.5)" : "#c9a55c",
            border: "none",
            borderRadius: 10,
            padding: "10px 20px",
            cursor: loading ? "wait" : "pointer",
            transition: "background 0.15s",
          }}
        >
          {loading ? "…" : "Hỏi"}
        </button>
      </div>

      {error && (
        <p style={{ fontFamily: "var(--font-space-grotesk)", fontSize: 13, color: "#ef4444" }}>
          {error}
        </p>
      )}

      {result && !result.had_hits && (
        <p style={{ fontFamily: "var(--font-space-grotesk)", fontSize: 13, color: "#8892a8" }}>
          Không tìm thấy thông tin liên quan trong tài liệu.
        </p>
      )}

      {result?.answer && (
        <div>
          <div style={{ fontFamily: "var(--font-space-grotesk)", fontSize: 14, color: "#ede8df", lineHeight: 1.6 }}>
            {result.answer}
          </div>
          {result.citations.map((c) => (
            <CitationCard key={c.citation_id} c={c} />
          ))}
        </div>
      )}
    </div>
  );
}
