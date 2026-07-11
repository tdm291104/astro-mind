"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface SharedMessage {
  role: "user" | "assistant";
  content: string;
  route: string | null;
  citations: unknown[] | null;
}

interface SharedConversation {
  id: string;
  title: string;
  messages: SharedMessage[];
}

export default function SharePage({ params }: { params: { token: string } }) {
  const [conv, setConv] = useState<SharedConversation | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`/api/share/${encodeURIComponent(params.token)}`)
      .then((r) => {
        if (!r.ok) { setError(true); return null; }
        return r.json();
      })
      .then((d) => { if (d) setConv(d as SharedConversation); })
      .catch(() => setError(true));
  }, [params.token]);

  return (
    <div style={{
      minHeight: "100vh", background: "#060a14",
      color: "#ede8df", display: "flex", flexDirection: "column",
    }}>
      {/* Header */}
      <header style={{
        padding: "20px 32px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <span style={{
          fontFamily: "var(--font-instrument-serif)", fontSize: 22, color: "#c9a55c",
        }}>
          AstroMind
        </span>
        <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 18 }}>·</span>
        <span style={{
          fontFamily: "var(--font-space-grotesk)", fontSize: 13, color: "#8892a8",
        }}>
          Hội thoại được chia sẻ
        </span>
      </header>

      {/* Content */}
      <main style={{ flex: 1, maxWidth: 780, width: "100%", margin: "0 auto", padding: "32px 20px 80px" }}>
        {!conv && !error && (
          <div style={{ textAlign: "center", color: "#8892a8", paddingTop: 60,
            fontFamily: "var(--font-jetbrains-mono)", fontSize: 12 }}>
            Đang tải...
          </div>
        )}

        {error && (
          <div style={{ textAlign: "center", paddingTop: 60 }}>
            <div style={{ fontFamily: "var(--font-instrument-serif)", fontSize: 28,
              color: "#ede8df", marginBottom: 12 }}>
              Link không hợp lệ
            </div>
            <div style={{ fontFamily: "var(--font-space-grotesk)", fontSize: 14,
              color: "#8892a8", marginBottom: 32 }}>
              Hội thoại này không tồn tại hoặc link đã hết hạn.
            </div>
            <a href="/chat" style={{
              display: "inline-block", padding: "10px 24px",
              background: "#c9a55c", color: "#060a14",
              borderRadius: 10, fontFamily: "var(--font-space-grotesk)",
              fontWeight: 600, fontSize: 14, textDecoration: "none",
            }}>
              Bắt đầu hội thoại của bạn →
            </a>
          </div>
        )}

        {conv && (
          <>
            <h1 style={{
              fontFamily: "var(--font-instrument-serif)", fontSize: 28,
              color: "#ede8df", marginBottom: 32, fontWeight: 400,
            }}>
              {conv.title}
            </h1>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {conv.messages.map((m, i) => {
                if (m.role === "user") {
                  return (
                    <div key={i} style={{ display: "flex", justifyContent: "flex-end" }}>
                      <div style={{
                        padding: "13px 17px",
                        borderRadius: "16px 16px 4px 16px",
                        background: "#c9a55c", color: "#060a14",
                        fontSize: 14, lineHeight: 1.65, fontWeight: 500,
                        maxWidth: "75%", whiteSpace: "pre-wrap",
                      }}>
                        {m.content}
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={i} style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
                    {/* Avatar */}
                    <div style={{
                      width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                      background: "rgba(201,165,92,0.1)",
                      border: "1px solid rgba(201,165,92,0.22)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: "var(--font-instrument-serif)", fontSize: 14, color: "#c9a55c",
                    }}>
                      ✦
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, maxWidth: "80%" }}>
                      <div style={{
                        padding: "14px 17px",
                        borderRadius: "16px 16px 16px 4px",
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.07)",
                        color: "#ede8df", fontSize: 14, lineHeight: 1.7,
                      }}>
                        <div className="prose prose-invert prose-sm max-w-none">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {m.content}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* CTA */}
            <div style={{ marginTop: 48, textAlign: "center" }}>
              <a href="/chat" style={{
                display: "inline-block", padding: "12px 28px",
                background: "#c9a55c", color: "#060a14",
                borderRadius: 12, fontFamily: "var(--font-space-grotesk)",
                fontWeight: 600, fontSize: 15, textDecoration: "none",
              }}>
                Bắt đầu hội thoại của bạn →
              </a>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
