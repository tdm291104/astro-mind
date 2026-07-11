"use client";

import { useEffect, useState } from "react";

import AnalysisPanel from "@/components/workspace/AnalysisPanel";
import FitsViewer from "@/components/workspace/FitsViewer";
import { getDocumentView, type DocumentView } from "@/lib/api";

function DocumentContent({ view }: { view: DocumentView }) {
  switch (view.kind) {
    case "pdf":
      if (!view.file_url) return <p className="text-center text-ink-muted">Thiếu URL file</p>;
      return (
        <iframe
          src={view.file_url}
          title={view.name}
          className="h-full min-h-[80vh] w-full border-0"
        />
      );
    case "text":
      if (!view.text) return <p className="text-center text-ink-muted">Không có nội dung văn bản</p>;
      return (
        <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-ivory/90">
          {view.text}
        </pre>
      );
    case "url":
      if (!view.url) return <p className="text-center text-ink-muted">Thiếu URL nguồn</p>;
      return (
        <div className="flex h-full flex-col gap-2">
          <a
            href={view.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs text-aurora underline"
          >
            Mở tab mới →
          </a>
          <iframe
            src={view.url}
            title={view.name}
            sandbox="allow-scripts allow-same-origin"
            referrerPolicy="no-referrer"
            className="min-h-[80vh] w-full flex-1 border-0"
          />
        </div>
      );
    case "image":
      if (!view.image_url) return <p className="text-center text-ink-muted">Thiếu URL ảnh</p>;
      if (view.type === "fits") {
        return (
          <FitsViewer
            docId={view.id}
            name={view.name}
            baseImageUrl={view.image_url}
          />
        );
      }
      return (
        <div className="flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={view.image_url} alt={view.name} className="max-w-full rounded-lg" />
        </div>
      );
  }
}

export default function DocumentViewer({
  id,
  onAskQuestion,
}: {
  id: string;
  onAskQuestion?: (question: string) => void;
}) {
  const [view, setView] = useState<DocumentView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"content" | "analysis">("content");

  useEffect(() => {
    void getDocumentView(id)
      .then(setView)
      .catch(() => setError("Không thể tải tài liệu"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => setTab("content"), [id]);

  if (loading) return <div className="flex items-center justify-center py-12 text-ink-muted">Đang tải…</div>;
  if (error || !view) return <p className="text-center text-ink-muted">{error ?? "Không thể tải tài liệu"}</p>;

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={() => setTab("content")}
          className={`rounded-md px-3 py-1.5 font-mono text-xs transition-colors ${
            tab === "content" ? "bg-white/[0.06] text-aurora" : "text-ink-muted hover:text-ink"
          }`}
        >
          Nội dung
        </button>
        <button
          type="button"
          onClick={() => setTab("analysis")}
          className={`rounded-md px-3 py-1.5 font-mono text-xs transition-colors ${
            tab === "analysis" ? "bg-white/[0.06] text-aurora" : "text-ink-muted hover:text-ink"
          }`}
        >
          Phân tích
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {tab === "content" ? (
          <DocumentContent view={view} />
        ) : (
          <AnalysisPanel docId={id} onAskQuestion={onAskQuestion} />
        )}
      </div>
    </div>
  );
}
