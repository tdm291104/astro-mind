"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import "katex/dist/katex.min.css";

import { getDocumentAnalysis, type DocumentAnalysis } from "@/lib/api";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-line bg-white/[0.02] p-4">
      <h3 className="mb-2 font-mono text-xs uppercase tracking-wider text-aurora">{title}</h3>
      <div className="text-sm leading-relaxed text-ivory/90">{children}</div>
    </div>
  );
}

export default function AnalysisPanel({
  docId,
  onAskQuestion,
  pollMs = 3000,
}: {
  docId: string;
  onAskQuestion?: (question: string) => void;
  pollMs?: number;
}) {
  const [data, setData] = useState<DocumentAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorKind, setErrorKind] = useState<"upsell" | "error" | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErrorKind(null);
    setData(null);
    getDocumentAnalysis(docId)
      .then((d) => { if (!cancelled) setData(d); })
      .catch((err: Error) => {
        if (cancelled) return;
        setErrorKind(err.message.includes("404") ? "upsell" : "error");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [docId]);

  useEffect(() => {
    if (!data || (data.status !== "pending" && data.status !== "processing")) return;
    let cancelled = false;
    const id = setInterval(() => {
      getDocumentAnalysis(docId).then((d) => { if (!cancelled) setData(d); }).catch(() => {});
    }, pollMs);
    return () => { cancelled = true; clearInterval(id); };
  }, [docId, data, pollMs]);

  if (loading) {
    return <div className="flex items-center justify-center py-12 text-ink-muted">Đang tải…</div>;
  }

  if (errorKind === "upsell") {
    return (
      <div className="rounded-lg border border-line bg-white/[0.02] p-6 text-center text-sm text-ink-muted">
        Nâng cấp lên gói Pro để mở khóa phân tích sâu (bảng, công thức, thiên thể, FITS header...)
      </div>
    );
  }

  if (errorKind || !data) {
    return <p className="text-center text-ink-muted">Không thể tải phân tích</p>;
  }

  if (data.status === "pending" || data.status === "processing") {
    return (
      <div className="flex items-center justify-center py-12 text-ink-muted">
        Đang phân tích sâu tài liệu…
      </div>
    );
  }

  if (data.status === "failed" || !data.analysis) {
    return (
      <p className="text-center text-ink-muted">
        Phân tích thất bại{data.error ? `: ${data.error}` : ""}
      </p>
    );
  }

  const a = data.analysis;

  return (
    <div className="flex flex-col gap-4">
      <Section title="Tổng quan">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{a.overall_summary}</ReactMarkdown>
        {a.key_astronomy_insights.length > 0 && (
          <ul className="mt-2 list-disc pl-5">
            {a.key_astronomy_insights.map((insight, i) => (
              <li key={i}>{insight}</li>
            ))}
          </ul>
        )}
      </Section>

      {a.fits_analysis ? (
        <Section title="Phân tích FITS Header">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
            {Object.entries(a.fits_analysis).map(([key, value]) => (
              <div key={key}>
                <dt className="font-mono text-xs text-ink-muted">{key}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </Section>
      ) : (
        <>
          {a.celestial_objects.length > 0 && (
            <Section title="Thiên thể">
              <div className="flex flex-col gap-3">
                {a.celestial_objects.map((obj, i) => (
                  <div key={i}>
                    <p className="font-semibold text-ivory">{obj.name} ({obj.type})</p>
                    <ul className="list-disc pl-5">
                      {Object.entries(obj.properties).map(([k, v]) => (
                        <li key={k}>{k}: {String(v)}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {a.tables_extracted.length > 0 && (
            <Section title="Bảng số liệu">
              <div className="flex flex-col gap-3">
                {a.tables_extracted.map((t, i) => (
                  <div key={i}>
                    <p className="font-semibold text-ivory">{t.title}</p>
                    <p>{t.summary}</p>
                    <ul className="list-disc pl-5">
                      {t.key_rows.map((row, j) => <li key={j}>{row}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {a.formulas.length > 0 && (
            <Section title="Công thức">
              <div className="flex flex-col gap-3">
                {a.formulas.map((f, i) => (
                  <div key={i}>
                    <div className="prose prose-invert prose-sm max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                        {`$$${f.expression}$$`}
                      </ReactMarkdown>
                    </div>
                    <p className="text-ink-muted">{f.meaning}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </>
      )}

      {a.references.length > 0 && (
        <Section title="Tài liệu tham khảo">
          <ul className="list-disc pl-5">
            {a.references.map((r, i) => (
              <li key={i}>
                {r.paper}
                {r.link && (
                  <>
                    {" — "}
                    <a href={r.link} target="_blank" rel="noopener noreferrer" className="text-aurora underline">
                      {r.link}
                    </a>
                  </>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {a.important_values.length > 0 && (
        <Section title="Tham số quan trọng">
          <ul className="list-disc pl-5">
            {a.important_values.map((v, i) => (
              <li key={i}>{v.name}: {v.value} {v.unit}</li>
            ))}
          </ul>
        </Section>
      )}

      {a.research_gaps.length > 0 && (
        <Section title="Khoảng trống nghiên cứu">
          <ul className="list-disc pl-5">
            {a.research_gaps.map((g, i) => <li key={i}>{g}</li>)}
          </ul>
        </Section>
      )}

      {a.suggested_questions.length > 0 && (
        <Section title="Câu hỏi gợi ý">
          <div className="flex flex-col gap-2">
            {a.suggested_questions.map((q, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onAskQuestion?.(q)}
                className="rounded-md border border-line bg-white/[0.02] px-3 py-2 text-left text-sm text-ivory/90 transition-colors hover:bg-white/5"
              >
                {q}
              </button>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
