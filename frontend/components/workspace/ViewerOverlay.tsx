"use client";

import { useEffect } from "react";

import DocumentViewer from "@/components/workspace/DocumentViewer";
import ReportViewer from "@/components/workspace/ReportViewer";
import type { DocumentMeta } from "@/lib/api";

interface Props {
  viewer: { type: "report" | "doc"; id: string } | null;
  docs: DocumentMeta[];
  onClose: () => void;
  onAskQuestion?: (question: string) => void;
}

export default function ViewerOverlay({ viewer, docs, onClose, onAskQuestion }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!viewer) return null;
  const doc = viewer.type === "doc" ? docs.find((d) => d.id === viewer.id) : undefined;

  return (
    <div className="flex h-[calc(100vh-9rem)] animate-fade-scale flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-line px-4 py-2.5">
        <span className="font-mono text-xs text-ink-muted">
          {viewer.type === "doc" ? `📄 ${doc?.name ?? viewer.id}` : ""}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng viewer"
          className="rounded-lg px-2.5 py-1 font-mono text-xs text-ink-muted transition-colors hover:bg-white/5 hover:text-ink"
        >
          ✕ Đóng
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        {viewer.type === "report" ? (
          <ReportViewer id={viewer.id} />
        ) : (
          <DocumentViewer id={viewer.id} onAskQuestion={onAskQuestion} />
        )}
      </div>
    </div>
  );
}
