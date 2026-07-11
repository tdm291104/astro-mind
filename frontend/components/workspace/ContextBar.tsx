"use client";

import type { DocumentMeta } from "@/lib/api";

interface Props {
  context: { docIds: string[]; web: boolean };
  docs: DocumentMeta[];
  onRemoveDoc: (id: string) => void;
  onToggleWeb: () => void;
  onAddDoc: () => void;
}

export default function ContextBar({ context, docs, onRemoveDoc, onToggleWeb, onAddDoc }: Props) {
  const docMap = Object.fromEntries(docs.map((d) => [d.id, d.name]));

  return (
    <div
      className="context-bar flex shrink-0 flex-wrap items-center gap-2 border-b border-line px-6 py-2.5"
      style={{ background: "rgba(7,12,26,0.5)" }}
    >
      <span className="mr-1 font-mono text-[11px] text-ink-muted">CONTEXT:</span>

      {context.docIds.map((id) => (
        <div
          key={id}
          className="chip flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs"
          style={{
            background: "rgba(201,165,92,0.08)",
            borderColor: "rgba(201,165,92,0.25)",
            color: "var(--aurora-teal, #c9a55c)",
          }}
        >
          <span aria-hidden="true">📄</span> {docMap[id] ?? id}
          <button
            type="button"
            aria-label={`Remove ${docMap[id] ?? id}`}
            onClick={() => onRemoveDoc(id)}
            className="text-[10px] opacity-60 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      ))}

      <button
        type="button"
        aria-label="Web Search"
        onClick={onToggleWeb}
        className="chip flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs transition-all"
        style={
          context.web
            ? { background: "rgba(201,165,92,0.08)", borderColor: "rgba(201,165,92,0.25)", color: "var(--aurora-cyan, #c9a55c)" }
            : { background: "rgba(255,255,255,0.03)", borderColor: "var(--border, rgba(255,255,255,0.08))", color: "var(--text-muted, rgba(255,255,255,0.35))" }
        }
      >
        🌐 Web Search
      </button>

      <button
        type="button"
        onClick={onAddDoc}
        className="chip flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs transition-all hover:text-ink-soft"
        style={{
          background: "rgba(255,255,255,0.03)",
          borderColor: "var(--border, rgba(255,255,255,0.08))",
          color: "var(--text-muted, rgba(255,255,255,0.35))",
        }}
      >
        ＋ Thêm
      </button>
    </div>
  );
}
