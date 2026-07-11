"use client";

import { useEffect, useRef, useState } from "react";

import { useReveal } from "./useReveal";

interface DemoMessage {
  role: "user" | "assistant";
  text: string;
  data?: { label: string; value: string }[] | null;
  sources?: string | null;
}

interface ConversationStep {
  role: "user" | "assistant" | "agent-status";
  text: string;
  data?: { label: string; value: string }[] | null;
  sources?: string | null;
}

const DEMO_CONVERSATION: ConversationStep[] = [
  { role: "user", text: "Chúng ta biết gì về khả năng có sự sống trên Europa?" },
  { role: "agent-status", text: "Search Agent đang tìm kiếm trong cơ sở dữ liệu thiên văn..." },
  { role: "agent-status", text: "Notebook Agent đang xử lý 12 bài báo liên quan..." },
  { role: "agent-status", text: "Chat Agent đang soạn câu trả lời..." },
  {
    role: "assistant",
    text: "Europa là một trong những ứng cử viên hứa hẹn nhất cho sự sống ngoài Trái Đất trong hệ mặt trời. Đây là những gì nghiên cứu hiện tại cho chúng ta biết:",
    data: [
      { label: "Độ sâu đại dương ngầm", value: "60 – 150 km" },
      { label: "Thể tích đại dương", value: "2 – 3× đại dương Trái Đất" },
      { label: "Nhiệt độ bề mặt", value: "−160°C (xích đạo)" },
      { label: "Hợp chất chính", value: "NaCl, MgSO₄, O₂" },
    ],
    sources: "Pappalardo et al. (2025), NASA Europa Clipper preliminary data, Trumbo & Brown (2024)",
  },
];

function wait(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

function TypingIndicator() {
  return (
    <div
      style={{
        display: "flex",
        gap: 5,
        padding: "10px 16px",
        background: "rgba(255,255,255,0.04)",
        borderRadius: 14,
        width: "fit-content",
      }}
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "var(--ld-text-dim)",
            display: "inline-block",
            animation: `ld-pulse-glow 1.2s ${i * 0.2}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

function ChatBubble({ msg }: { msg: DemoMessage }) {
  const isUser = msg.role === "user";
  return (
    <div
      style={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
        animation: "ld-fade-up 0.4s ease",
      }}
    >
      <div
        style={{
          maxWidth: "82%",
          padding: "12px 16px",
          borderRadius: isUser ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
          background: isUser ? "var(--ld-accent)" : "rgba(255,255,255,0.06)",
          color: isUser ? "var(--ld-bg-deep)" : "var(--ld-text-primary)",
          fontSize: 14,
          lineHeight: 1.6,
          fontWeight: isUser ? 500 : 400,
        }}
      >
        <div>{msg.text}</div>
        {msg.data && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "6px 16px",
              marginTop: 14,
              padding: 14,
              background: "rgba(0,0,0,0.2)",
              borderRadius: 10,
              fontSize: 12,
            }}
          >
            {msg.data.map((d, i) => (
              <div key={i}>
                <div
                  style={{
                    color: "var(--ld-text-dim)",
                    fontFamily: "var(--ld-font-mono)",
                    fontSize: 10,
                    marginBottom: 2,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  {d.label}
                </div>
                <div style={{ color: "var(--ld-text-primary)", fontWeight: 500 }}>
                  {d.value}
                </div>
              </div>
            ))}
          </div>
        )}
        {msg.sources && (
          <div
            style={{
              marginTop: 10,
              fontSize: 11,
              color: "var(--ld-text-dim)",
              fontFamily: "var(--ld-font-mono)",
              borderTop: "1px solid rgba(255,255,255,0.06)",
              paddingTop: 8,
            }}
          >
            📎 {msg.sources}
          </div>
        )}
      </div>
    </div>
  );
}

export function InteractiveDemo() {
  const [ref, vis] = useReveal(0.1);
  const [messages, setMessages] = useState<DemoMessage[]>([]);
  const [inputVal, setInputVal] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [agentStatus, setAgentStatus] = useState("");
  const [hasPlayed, setHasPlayed] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (vis && !hasPlayed) {
      setHasPlayed(true);
      playDemo();
    }
  }, [vis]); // eslint-disable-line react-hooks/exhaustive-deps

  async function playDemo() {
    setMessages([]);
    setAgentStatus("");
    for (let i = 0; i < DEMO_CONVERSATION.length; i++) {
      const msg = DEMO_CONVERSATION[i];
      await wait(i === 0 ? 600 : 500);
      if (msg.role === "agent-status") {
        setAgentStatus(msg.text);
        setIsTyping(true);
        await wait(900);
      } else if (msg.role === "user") {
        setMessages((prev) => [...prev, { role: "user", text: msg.text }]);
        await wait(800);
      } else {
        setIsTyping(false);
        setAgentStatus("");
        await wait(200);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: msg.text, data: msg.data, sources: msg.sources },
        ]);
      }
    }
    setIsTyping(false);
  }

  function handleSend() {
    if (!inputVal.trim()) return;
    const q = inputVal.trim();
    setInputVal("");
    setMessages((prev) => [...prev, { role: "user", text: q }]);
    setIsTyping(true);
    setAgentStatus("Search Agent đang tìm kiếm...");
    setTimeout(() => setAgentStatus("Chat Agent đang soạn câu trả lời..."), 1200);
    setTimeout(() => {
      setIsTyping(false);
      setAgentStatus("");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: `Câu hỏi hay về "${q}". Trong phiên đầy đủ, các tác tử AI sẽ tìm kiếm cơ sở dữ liệu thiên văn, phân tích bài báo liên quan và tổng hợp câu trả lời kèm trích dẫn. Đăng ký để trải nghiệm đầy đủ!`,
          data: null,
          sources: null,
        },
      ]);
    }, 2400);
  }

  useEffect(() => {
    chatEndRef.current?.scrollIntoView?.({ behavior: "smooth", block: "nearest" });
  }, [messages, agentStatus]);

  return (
    <section id="demo" style={{ padding: "var(--ld-section-pad) 0", position: "relative" }}>
      <div
        ref={ref}
        style={{
          maxWidth: "var(--ld-content-max)",
          margin: "0 auto",
          padding: "0 clamp(20px, 4vw, 40px)",
          opacity: vis ? 1 : 0,
          transform: vis ? "none" : "translateY(30px)",
          transition: "all 0.8s ease",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <p
            style={{
              fontFamily: "var(--ld-font-mono)",
              fontSize: 12,
              color: "var(--ld-accent)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: 14,
            }}
          >
            Thử Ngay
          </p>
          <h2
            style={{
              fontSize: "clamp(32px, 4.5vw, 52px)",
              fontFamily: "var(--ld-font-serif)",
              color: "var(--ld-text-primary)",
              marginBottom: 16,
            }}
          >
            Xem Các Tác Tử Hoạt Động
          </h2>
          <p
            style={{
              fontSize: 17,
              color: "var(--ld-text-secondary)",
              maxWidth: 460,
              margin: "0 auto",
            }}
          >
            Xem cách các tác tử AI phối hợp để trả lời một câu hỏi nghiên cứu
            duy nhất.
          </p>
        </div>

        {/* Chat window */}
        <div
          style={{
            maxWidth: 720,
            margin: "0 auto",
            background: "rgba(8,12,24,0.9)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 16,
            overflow: "hidden",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
          }}
        >
          {/* Title bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 20px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              background: "rgba(255,255,255,0.02)",
            }}
          >
            <div style={{ display: "flex", gap: 7 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff5f57", display: "inline-block" }} />
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#febc2e", display: "inline-block" }} />
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#28c840", display: "inline-block" }} />
            </div>
            <span
              style={{
                fontFamily: "var(--ld-font-mono)",
                fontSize: 11,
                color: "var(--ld-text-dim)",
              }}
            >
              Astro Mind — Phiên Nghiên Cứu
            </span>
            <button
              onClick={playDemo}
              style={{
                fontFamily: "var(--ld-font-mono)",
                fontSize: 10,
                color: "var(--ld-accent)",
                background: "none",
                border: "1px solid rgba(201,165,92,0.25)",
                borderRadius: 6,
                padding: "3px 10px",
                cursor: "pointer",
              }}
            >
              Phát lại
            </button>
          </div>

          {/* Messages */}
          <div
            style={{
              height: 380,
              overflowY: "auto",
              padding: "24px 20px",
              display: "flex",
              flexDirection: "column",
              gap: 16,
              scrollbarWidth: "thin",
              scrollbarColor: "rgba(255,255,255,0.1) transparent",
            }}
          >
            {messages.map((msg, i) => (
              <ChatBubble key={i} msg={msg} />
            ))}
            {isTyping && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  animation: "ld-fade-up 0.3s ease",
                }}
              >
                {agentStatus && (
                  <div
                    style={{
                      fontFamily: "var(--ld-font-mono)",
                      fontSize: 11,
                      color: "var(--ld-accent)",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "var(--ld-accent)",
                        display: "inline-block",
                        animation: "ld-pulse-glow 1s infinite",
                      }}
                    />
                    {agentStatus}
                  </div>
                )}
                <TypingIndicator />
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div
            style={{
              display: "flex",
              gap: 10,
              padding: "14px 16px",
              borderTop: "1px solid rgba(255,255,255,0.06)",
              background: "rgba(255,255,255,0.02)",
            }}
          >
            <input
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Hỏi về bất kỳ chủ đề thiên văn nào..."
              style={{
                flex: 1,
                fontFamily: "var(--ld-font-sans)",
                fontSize: 14,
                color: "var(--ld-text-primary)",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 10,
                padding: "10px 16px",
                outline: "none",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) =>
                (e.target.style.borderColor = "rgba(201,165,92,0.3)")
              }
              onBlur={(e) =>
                (e.target.style.borderColor = "rgba(255,255,255,0.08)")
              }
            />
            <button
              onClick={handleSend}
              style={{
                fontFamily: "var(--ld-font-sans)",
                fontSize: 14,
                fontWeight: 600,
                color: "var(--ld-bg-deep)",
                background: "var(--ld-accent)",
                border: "none",
                borderRadius: 10,
                padding: "10px 20px",
                cursor: "pointer",
                transition: "opacity 0.2s",
                opacity: inputVal.trim() ? 1 : 0.5,
              }}
            >
              Gửi
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
