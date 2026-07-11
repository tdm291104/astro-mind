"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import "katex/dist/katex.min.css";

import InputBar from "@/components/workspace/InputBar";
import { parseModeCommand } from "@/components/workspace/mode";
import { ThinkingStep, type Step } from "@/components/workspace/ThinkingStep";
import { getConversation, getReport, postAssistant, streamConverse, shareConversation, type DoneAgentEvent, type ActionAgentEvent, type Citation, type ArxivPaper, type WebSource, type DocumentMeta } from "@/lib/api";
import { AssistantAvatar, ActionsSection, ImageStrip, MessagePills, extractImages } from "@/components/chat/MessageBody";

// eslint-disable-next-line @next/next/no-img-element
const mdImg = ({ src, alt }: { src?: string; alt?: string }) => (
  <img
    src={src ? src.replace(/ /g, "%20") : src}
    alt={alt ?? ""}
    style={{ maxWidth: "100%", borderRadius: 8, marginTop: 6, marginBottom: 6 }}
  />
);

interface Message {
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
  citations?: Citation[];
  arxiv_papers?: ArxivPaper[];
  web_sources?: WebSource[];
  route?: string;
  report_id?: string;
  steps?: Step[];
  generating?: boolean;
  suggested_action?: { type: string } | null;
}

export interface ChatPanelHandle {
  injectPrompt: (text: string) => void;
  exportCitations: () => void;
}

interface ChatPanelProps {
  context?: { docIds: string[]; web: boolean };
  docs?: DocumentMeta[];
  onToggleDoc?: (id: string) => void;
  onOpenViewer?: (v: { type: "report" | "doc"; id: string }) => void;
  conversationId?: string | null;
  onCreated?: (id: string) => void;
  onActivity?: (route: string) => void;
}

const SOURCE_LABELS: Record<string, string> = {
  arxiv: "arXiv",
  images: "NASA Images",
  apod: "APOD",
  web: "Web",
};

function getActionLabel(tool: string, args: Record<string, unknown>): string {
  if (tool === "call_search_agent") {
    const sources = args.sources as string[] | undefined;
    if (!sources || sources.length === 0) return "Tìm kiếm đa nguồn";
    if (sources.length === 1) {
      if (sources[0] === "arxiv") return "Tìm kiếm nghiên cứu arXiv";
      if (sources[0] === "images") return "Tìm kiếm hình ảnh NASA";
      if (sources[0] === "apod") return "Tìm kiếm ảnh thiên văn APOD";
      if (sources[0] === "web") return "Tìm kiếm trang web";
      return "Tìm kiếm thông tin";
    }
    const named = sources.map((s) => SOURCE_LABELS[s] ?? s).join(" · ");
    return `Tìm kiếm ${named}`;
  }
  if (tool === "call_notebook_agent") return "Phân tích tài liệu người dùng";
  if (tool === "call_report_agent") return "Tạo báo cáo";
  if (tool === "analyze_astronomy_image") return "Phân tích hình ảnh";
  return "Xử lý";
}

function TypingDots() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ display: "flex", gap: 4 }}>
        {[0, 1, 2].map((i) => (
          <span key={i} style={{
            width: 5, height: 5, borderRadius: "50%", background: "#4a5568",
            animation: `pulsar 1.2s ${i * 0.2}s ease-out infinite`,
            display: "inline-block",
          }} />
        ))}
      </div>
      <span style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: 10, color: "#4a5568" }}>
        Đang xử lý…
      </span>
    </div>
  );
}

const ChatPanel = forwardRef<ChatPanelHandle, ChatPanelProps>(function ChatPanel({
  context,
  docs = [],
  onToggleDoc,
  onOpenViewer,
  conversationId = null,
  onCreated,
  onActivity,
}: ChatPanelProps, ref) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(conversationId);
  const [convTitle, setConvTitle] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [thinkingSteps, setThinkingSteps] = useState<Step[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [inject, setInject] = useState<{ text: string; stamp: number } | null>(null);
  const [shareCopied, setShareCopied] = useState<string | null>(null);
  const shareTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streamingTextRef = useRef("");
  const thinkingStepsRef = useRef<Step[]>([]);
  const thinkingAddedRef = useRef(false);
  const synthesisAddedRef = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const justCreatedConvRef = useRef<string | null>(null);
  const pendingReportIds = useRef<Set<string>>(new Set());
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  useImperativeHandle(ref, () => ({
    injectPrompt: (text: string) => {
      setInject({ text, stamp: Date.now() });
    },
    exportCitations: () => {
      const all = messagesRef.current.flatMap((m) => m.citations ?? []);
      if (all.length === 0) return;
      const content = all
        .map((c) =>
          [
            `[${c.citation_id}] ${c.doc_name}${c.page != null ? ` — trang ${c.page}` : ""}`,
            c.section ? `Mục: ${c.section}` : null,
            c.excerpt,
          ]
            .filter(Boolean)
            .join("\n"),
        )
        .join("\n\n---\n\n");
      const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "citations.txt";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
  }), []);

  useEffect(() => {
    setSessionId(conversationId);
    if (!conversationId) { setMessages([]); setConvTitle(null); return; }
    // Skip DB reload if we just created this conversation — local state already has steps
    if (justCreatedConvRef.current === conversationId) {
      justCreatedConvRef.current = null;
      return;
    }
    void getConversation(conversationId)
      .then((d) => {
        setConvTitle(d.title);
        setMessages(d.messages.map((m) => ({
          role: m.role, content: m.content, route: m.route ?? undefined,
          citations: m.citations ?? undefined,
          arxiv_papers: m.arxiv_papers ?? undefined,
          web_sources: m.web_sources ?? undefined,
          imageUrl: m.image_url ? `/api${m.image_url}` : undefined,
        })));
      })
      .catch(() => setMessages([]));
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, isStreaming, streamingText]);

  // Poll pending background reports until they're ready
  function startPollingReport(reportId: string) {
    pendingReportIds.current.add(reportId);
    schedulePoll();
  }

  function schedulePoll() {
    if (pollTimerRef.current) return; // already scheduled
    pollTimerRef.current = setTimeout(async () => {
      pollTimerRef.current = null;
      const ids = Array.from(pendingReportIds.current);
      for (const rid of ids) {
        try {
          const r = await getReport(rid);
          if (!r.payload.generating) {
            pendingReportIds.current.delete(rid);
            setMessages((prev) =>
              prev.map((m) => m.report_id === rid ? { ...m, generating: false } : m)
            );
          }
        } catch {
          // keep polling on error
        }
      }
      if (pendingReportIds.current.size > 0) schedulePoll();
    }, 3000);
  }

  // Cleanup poll timer on unmount
  useEffect(() => () => { if (pollTimerRef.current) clearTimeout(pollTimerRef.current); }, []);
  useEffect(() => () => { if (shareTimeoutRef.current) clearTimeout(shareTimeoutRef.current); }, []);

  async function sendText(text: string) {
    const t = text.trim();
    if (!t || loading) return;
    const ctx = context ?? { docIds: [], web: true };
    const cmd = parseModeCommand(t);
    const messageText = cmd ? (cmd.rest || t) : t;
    const modeOpt = cmd ? { mode: cmd.mode } : {};
    setMessages((prev) => [...prev, { role: "user", content: t }]);
    setLoading(true);
    try {
      const res = await postAssistant(messageText, sessionId, {
        ...modeOpt,
        doc_ids: ctx.docIds,
        web: ctx.web,
      });
      if (!sessionId) {
        onCreated?.(res.session_id);
        if (!convTitle) setConvTitle(messageText.slice(0, 60));
      }
      setSessionId(res.session_id);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: res.reply,
          citations: res.citations.length ? res.citations : undefined,
          route: res.route,
          report_id: res.report_id,
        },
      ]);
      onActivity?.(res.route);
    } catch (err) {
      const is429 = err instanceof Error && err.message.includes("429");
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: is429 ? "Đã đạt giới hạn sử dụng. Vui lòng thử lại sau hoặc nâng cấp gói." : "Lỗi: không gọi được máy chủ" },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const handleConverse = async (text: string, image?: File | null) => {
    const t = text.trim();
    if (!t || isStreaming || loading) return;
    const ctx = context ?? { docIds: [], web: true };
    const cmd = parseModeCommand(t);
    const messageText = cmd ? (cmd.rest || t) : t;
    const modeOpt = cmd?.mode;

    if (modeOpt === "report") {
      void sendText(text);
      return;
    }

    const imageUrl = image ? URL.createObjectURL(image) : undefined;
    setMessages((prev) => [...prev, { role: "user", content: t, imageUrl }]);
    setIsStreaming(true);
    setStreamingText("");
    streamingTextRef.current = "";
    setThinkingSteps([]);
    thinkingStepsRef.current = [];
    thinkingAddedRef.current = true;
    synthesisAddedRef.current = false;

    const addStep = (step: Step) => {
      thinkingStepsRef.current = [...thinkingStepsRef.current, step];
      setThinkingSteps(thinkingStepsRef.current);
    };

    // Always start with "Phân tích yêu cầu" — even if no thinking event arrives (e.g., simple greetings)
    addStep({ label: "Phân tích yêu cầu" });

    try {
      for await (const event of streamConverse(messageText, {
        sessionId: sessionId,
        mode: modeOpt,
        doc_ids: ctx.docIds.length > 0 ? ctx.docIds : undefined,
        image: image ?? null,
      })) {
        if (event.type === "thinking") {
          // already added "Phân tích yêu cầu" above; skip duplicate
        } else if (event.type === "action") {
          const ae = event as ActionAgentEvent;
          addStep({ label: getActionLabel(ae.tool, ae.args) });
        } else if (event.type === "text_delta") {
          if (!synthesisAddedRef.current) {
            synthesisAddedRef.current = true;
            addStep({ label: "Tổng hợp câu trả lời" });
          }
          streamingTextRef.current += event.delta;
          setStreamingText(streamingTextRef.current);
        } else if (event.type === "done") {
          const done = event as DoneAgentEvent;
          const finalText = streamingTextRef.current;
          const capturedSteps = thinkingStepsRef.current.length > 0 ? [...thinkingStepsRef.current] : undefined;
          const isReportPending = done.route === "report" && !!done.report_id;
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: finalText,
              citations: done.citations?.length ? done.citations : undefined,
              arxiv_papers: done.arxiv_papers?.length ? done.arxiv_papers : undefined,
              web_sources: done.web_sources?.length ? done.web_sources : undefined,
              route: done.route,
              report_id: done.report_id ?? undefined,
              steps: capturedSteps,
              generating: isReportPending,
              suggested_action: done.suggested_action ?? undefined,
            },
          ]);
          if (isReportPending) startPollingReport(done.report_id!);
          if (done.session_id) {
            setSessionId(done.session_id);
            if (!sessionId) {
              justCreatedConvRef.current = done.session_id;
              onCreated?.(done.session_id);
              if (!convTitle) setConvTitle(messageText.slice(0, 60));
            }
          }
          onActivity?.(done.route ?? "chat");
        } else if (event.type === "error") {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: `Lỗi: ${(event as { type: "error"; message: string }).message}` },
          ]);
        }
      }
    } catch (err) {
      const is429 = err instanceof Error && err.message.includes("429");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: is429
            ? "Đã đạt giới hạn sử dụng. Vui lòng thử lại sau hoặc nâng cấp gói."
            : "Lỗi: không gọi được máy chủ",
        },
      ]);
    } finally {
      setIsStreaming(false);
      setStreamingText("");
      streamingTextRef.current = "";
      setThinkingSteps([]);
      thinkingStepsRef.current = [];
      thinkingAddedRef.current = false;
      synthesisAddedRef.current = false;
    }
  };

  const isEmpty = messages.length === 0 && !loading && !isStreaming;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>

      {/* Conversation header — shown when a convo is loaded */}
      {convTitle && (
        <div style={{
          display: "flex", alignItems: "flex-start", gap: 12,
          padding: "16px 20px 14px",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          flexShrink: 0,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: "var(--font-instrument-serif)", fontSize: 21, fontWeight: 400,
              color: "#ede8df", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>
              {convTitle}
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            {(["Export", "Share"] as const).map((label) => (
              <button
                key={label}
                type="button"
                style={{
                  padding: "6px 14px", borderRadius: 8,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  fontFamily: "var(--font-space-grotesk)", fontSize: 12, fontWeight: 500,
                  color: "#8892a8", cursor: "pointer", transition: "all 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.07)";
                  e.currentTarget.style.color = "#ede8df";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                  e.currentTarget.style.color = "#8892a8";
                }}
                onClick={label === "Export" ? () => {
                  const title = (convTitle ?? "conversation").replace(/[/\\?%*:|"<>]/g, "-");
                  const lines: string[] = [`# ${convTitle ?? "conversation"}`, ""];
                  const msgs = messages.filter((m) => m.role === "user" || m.role === "assistant");
                  msgs.forEach((msg, i) => {
                    const speaker = msg.role === "user" ? "**Bạn:**" : "**AstroMind:**";
                    lines.push(`${speaker} ${msg.content}`, "");
                    if (i < msgs.length - 1) lines.push("---", "");
                  });
                  const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `${title}.md`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                } : () => {
                  if (shareTimeoutRef.current) clearTimeout(shareTimeoutRef.current);
                  if (!conversationId) {
                    setShareCopied("Chưa có hội thoại");
                    shareTimeoutRef.current = setTimeout(() => setShareCopied(null), 1000);
                    return;
                  }
                  void shareConversation(conversationId)
                    .then(({ token }) => {
                      const url = `${window.location.origin}/share/${token}`;
                      return navigator.clipboard.writeText(url);
                    })
                    .then(() => {
                      setShareCopied("Đã sao chép!");
                      shareTimeoutRef.current = setTimeout(() => setShareCopied(null), 1500);
                    })
                    .catch(() => {
                      setShareCopied("Sao chép thất bại");
                      shareTimeoutRef.current = setTimeout(() => setShareCopied(null), 1500);
                    });
                }}
              >
                {label === "Share" && shareCopied != null ? shareCopied : label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div
        role="log"
        style={{ flex: 1, overflowY: "auto", padding: "20px 20px 8px", minHeight: 0 }}
      >
        {isEmpty && (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            height: "100%", gap: 0, position: "relative", overflow: "hidden",
          }}>
            {/* Radial glow */}
            <div style={{
              position: "absolute",
              width: "clamp(300px, 50vw, 600px)",
              height: "clamp(300px, 50vw, 600px)",
              background: "radial-gradient(circle, rgba(201,165,92,0.12) 0%, transparent 70%)",
              borderRadius: "50%",
              pointerEvents: "none",
            }} />

            {/* Tag pill */}
            <div className="ld-fade-up-1" style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "rgba(201,165,92,0.08)",
              border: "1px solid rgba(201,165,92,0.15)",
              borderRadius: 100, padding: "6px 16px",
              marginBottom: 24, position: "relative",
            }}>
              <span style={{ fontFamily: "var(--font-instrument-serif)", fontSize: 13, color: "#c9a55c" }}>✦</span>
              <span style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: 11, color: "#c9a55c", letterSpacing: "0.1em" }}>
                MULTI-AGENT ASTRONOMY AI
              </span>
            </div>

            {/* Headline */}
            <h1 className="ld-fade-up-2" style={{
              fontFamily: "var(--font-instrument-serif)",
              fontSize: "clamp(32px, 4vw, 60px)",
              fontWeight: 400,
              color: "#ede8df",
              lineHeight: 1.08,
              letterSpacing: "-0.02em",
              textAlign: "center",
              margin: 0,
              marginBottom: 16,
              position: "relative",
            }}>
              Ask anything about<br />the cosmos
            </h1>

            {/* Subtitle */}
            <p className="ld-fade-up-3" style={{
              fontFamily: "var(--font-space-grotesk)",
              fontSize: 15,
              color: "#8892a8",
              textAlign: "center",
              margin: 0,
              marginBottom: 36,
              maxWidth: 400,
              lineHeight: 1.6,
              position: "relative",
            }}>
              Khám phá vũ trụ cùng các agent AI chuyên biệt — tìm kiếm, phân tích, báo cáo xu hướng.
            </p>

            {/* Agent chips */}
            <div className="ld-fade-up-4" style={{
              display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center",
              position: "relative",
            }}>
              {[
                { name: "Chat Agent",     color: "#c9a55c", desc: "Hội thoại thiên văn" },
                { name: "Search Agent",   color: "#5b8def", desc: "Tìm kiếm NASA · arXiv" },
                { name: "Notebook Agent", color: "#22c55e", desc: "Phân tích tài liệu" },
                { name: "Image Agent",    color: "#06b6d4", desc: "Phân tích ảnh thiên văn" },
                { name: "Report Agent",   color: "#a78bfa", desc: "Báo cáo xu hướng" },
              ].map((a) => (
                <div key={a.name} style={{
                  display: "flex", alignItems: "center", gap: 8,
                  background: a.color + "12",
                  border: `1px solid ${a.color}28`,
                  borderRadius: 10, padding: "8px 14px",
                }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: a.color, display: "inline-block", flexShrink: 0 }} />
                  <div>
                    <div style={{ fontFamily: "var(--font-space-grotesk)", fontSize: 12, fontWeight: 600, color: a.color }}>{a.name}</div>
                    <div style={{ fontFamily: "var(--font-space-grotesk)", fontSize: 11, color: "#8892a8" }}>{a.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {messages.map((m, i) =>
            m.role === "user" ? (
              /* User message */
              <div key={i} style={{ display: "flex", justifyContent: "flex-end" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, maxWidth: "75%" }}>
                  {m.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={m.imageUrl}
                      alt="ảnh đính kèm"
                      style={{
                        maxWidth: 200, maxHeight: 150,
                        borderRadius: 10,
                        border: "1px solid rgba(255,255,255,0.1)",
                        objectFit: "cover",
                      }}
                    />
                  )}
                  <div style={{
                    padding: "13px 17px",
                    borderRadius: "16px 16px 4px 16px",
                    background: "#c9a55c",
                    color: "#060a14",
                    fontSize: 14, lineHeight: 1.65, fontWeight: 500,
                    whiteSpace: "pre-wrap",
                  }}>
                    {m.content}
                  </div>
                </div>
              </div>
            ) : (
              /* Assistant message */
              <div key={i} style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
                <AssistantAvatar />
                <div style={{ display: "flex", flexDirection: "column", gap: 6, maxWidth: "80%" }}>
                  {m.steps && m.steps.length > 0 && (
                    <ThinkingStep steps={m.steps} isStreaming={false} />
                  )}
                  <div style={{
                    padding: "14px 17px",
                    borderRadius: "16px 16px 16px 4px",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    color: "#ede8df",
                    fontSize: 14, lineHeight: 1.7,
                  }}>
                    <div className="prose prose-invert prose-sm max-w-none">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                        components={{ img: mdImg }}
                      >
                        {extractImages(m.content).text}
                      </ReactMarkdown>
                    </div>
                  </div>
                  <ImageStrip images={extractImages(m.content).images} />
                  <MessagePills
                    citations={m.citations}
                    arxivPapers={m.arxiv_papers}
                    webSources={m.web_sources}
                  />
                  <ActionsSection
                    route={m.route}
                    reportId={m.report_id}
                    generating={m.generating}
                    suggestedAction={m.suggested_action}
                    isLast={i === messages.length - 1}
                    isStreaming={isStreaming}
                    onOpenViewer={onOpenViewer}
                    onDiscoveryReport={() =>
                      handleConverse(
                        "Tạo báo cáo khám phá tổng hợp những gì chúng ta đã tìm hiểu trong phiên này",
                      )
                    }
                  />
                </div>
              </div>
            ),
          )}

          {isStreaming && (
            <div style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
              <AssistantAvatar />
              <div style={{ display: "flex", flexDirection: "column", gap: 6, maxWidth: "80%" }}>
                <ThinkingStep steps={thinkingSteps} isStreaming={isStreaming} />
                {streamingText && (
                  <div style={{
                    padding: "14px 17px",
                    borderRadius: "16px 16px 16px 4px",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    color: "#ede8df",
                    fontSize: 14, lineHeight: 1.7,
                  }}>
                    <div className="prose prose-invert prose-sm max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]} components={{ img: mdImg }}>
                        {extractImages(streamingText).text}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {loading && (
            <div style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
              <AssistantAvatar />
              <div style={{ paddingTop: 6 }}>
                <TypingDots />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div style={{ padding: "0 16px 12px", flexShrink: 0 }}>
        <InputBar
          onSend={(text, image) => void handleConverse(text, image)}
          disabled={loading || isStreaming}
          placeholder="Ask about any astronomy topic..."
          docs={docs}
          selectedDocIds={context?.docIds ?? []}
          onToggleDoc={onToggleDoc}
          inject={inject}
        />
      </div>
    </div>
  );
});

export default ChatPanel;
