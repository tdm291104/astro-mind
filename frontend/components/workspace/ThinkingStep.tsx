"use client";

import { useState } from "react";
import { useTranslation } from "@/lib/i18n/LanguageProvider";

export interface Step {
  label: string;
}

interface ThinkingStepProps {
  steps: Step[];
  isStreaming?: boolean;
}

export function ThinkingStep({ steps, isStreaming }: ThinkingStepProps) {
  const [open, setOpen] = useState(true);
  const { t } = useTranslation();
  const chatLbl = t("chat");

  if (steps.length === 0 && !isStreaming) return null;

  const isEmpty = steps.length === 0;

  return (
    <div style={{
      borderRadius: 10,
      border: "1px solid rgba(255,255,255,0.07)",
      background: "rgba(6,10,20,0.6)",
      backdropFilter: "blur(8px)",
      overflow: "hidden",
      marginBottom: 6,
    }}>
      {/* Header */}
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          width: "100%", padding: "9px 14px",
          background: "none", border: "none", cursor: "pointer",
          textAlign: "left",
        }}
      >
        {isEmpty ? (
          <span style={{
            width: 7, height: 7, borderRadius: "50%", background: "#c9a55c",
            display: "inline-block", flexShrink: 0,
            animation: "pulse 1.2s infinite",
          }} />
        ) : (
          <span style={{
            fontFamily: "var(--font-jetbrains-mono)",
            fontSize: 11, color: "rgba(201,165,92,0.6)", flexShrink: 0,
          }}>◈</span>
        )}

        <span style={{
          fontFamily: "var(--font-jetbrains-mono)",
          fontSize: 11, letterSpacing: "0.06em",
          color: isStreaming ? "#c9a55c" : "rgba(255,255,255,0.4)",
          flex: 1,
        }}>
          {isEmpty ? chatLbl.processingEllipsis : chatLbl.thinkingHeader.replace("{n}", String(steps.length))}
        </span>

        {!isEmpty && (
          <span style={{
            fontFamily: "var(--font-jetbrains-mono)",
            fontSize: 10, color: "rgba(255,255,255,0.2)",
          }}>
            {open ? "▾" : "▸"}
          </span>
        )}
      </button>

      {/* Step list */}
      {open && !isEmpty && (
        <div style={{
          borderTop: "1px solid rgba(255,255,255,0.05)",
          padding: "8px 14px 10px",
          display: "flex", flexDirection: "column", gap: 7,
        }}>
          {steps.map((s, i) => {
            const isDone = !isStreaming || i < steps.length - 1;
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                {isDone ? (
                  <span style={{
                    color: "#34d399", fontSize: 12, flexShrink: 0,
                    width: 14, lineHeight: 1,
                  }}>✓</span>
                ) : (
                  <span style={{
                    width: 7, height: 7, borderRadius: "50%", background: "#c9a55c",
                    display: "inline-block", flexShrink: 0,
                    animation: "pulse 1.2s infinite",
                    marginLeft: 3, marginRight: 4,
                  }} />
                )}
                <span style={{
                  fontFamily: "var(--font-space-grotesk)", fontSize: 12,
                  color: isDone ? "rgba(237,232,223,0.7)" : "#c9a55c",
                  lineHeight: 1.4,
                }}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
