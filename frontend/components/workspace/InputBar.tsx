"use client";

import { useEffect, useRef, useState } from "react";

import type { DocumentMeta } from "@/lib/api";
import { useTranslation } from "@/lib/i18n/LanguageProvider";

interface Props {
  onSend: (text: string, image?: File | null) => void;
  placeholder?: string;
  disabled?: boolean;
  hint?: boolean;
  docs?: DocumentMeta[];
  selectedDocIds?: string[];
  onToggleDoc?: (id: string) => void;
  inject?: { text: string; stamp: number } | null;
}

function CameraIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 5.5A1.5 1.5 0 012.5 4h1l1-2h5l1 2h1A1.5 1.5 0 0113 5.5v6A1.5 1.5 0 0111.5 13h-7A1.5 1.5 0 013 11.5v-6z" />
      <circle cx="8" cy="9" r="2" />
    </svg>
  );
}

function DocIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <path d="M10 1H4.5A1.5 1.5 0 003 2.5v11A1.5 1.5 0 004.5 15h7a1.5 1.5 0 001.5-1.5V4.5L10 1z" />
      <polyline points="10,1 10,4.5 13,4.5" opacity="0.5" />
      <line x1="5.5" y1="8" x2="10.5" y2="8" /><line x1="5.5" y1="11" x2="8.5" y2="11" />
    </svg>
  );
}

export default function InputBar({ onSend, placeholder, disabled, hint = true, docs = [], selectedDocIds = [], onToggleDoc, inject }: Props) {
  const { t } = useTranslation();
  const i = t("inputBar");

  const AGENT_DOTS = [
    { color: "#c9a55c", label: "Chat Agent",     title: "Chat" },
    { color: "#5b8def", label: "Search Agent",   title: "@search" },
    { color: "#22c55e", label: "Notebook Agent", title: "@notebook" },
    { color: "#a78bfa", label: "Report Agent",   title: "@report" },
    { color: "#06b6d4", label: "Image Agent",    title: i.uploadImage },
  ];

  const [text, setText] = useState("");
  const [showDocPicker, setShowDocPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!inject) return;
    setText(inject.text);
    textareaRef.current?.focus();
  }, [inject]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowDocPicker(false);
      }
    }
    if (showDocPicker) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showDocPicker]);

  function submit() {
    const t = text.trim();
    if (!t || disabled) return;
    onSend(t, pendingImage);
    setText("");
    setPendingImage(null);
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl(null);
    }
  }

  function handleImageFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    if (file.size > 10 * 1024 * 1024) {
      alert(i.imageTooLarge);
      return;
    }
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setPendingImage(file);
    setImagePreviewUrl(URL.createObjectURL(file));
  }

  function handleImageInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleImageFile(file);
    e.target.value = "";
  }

  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const file = e.clipboardData.files[0];
    if (file?.type.startsWith("image/")) {
      e.preventDefault();
      handleImageFile(file);
    }
  }

  function clearImage() {
    setPendingImage(null);
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl(null);
    }
  }

  const selectedCount = selectedDocIds.length;

  return (
    <div style={{ position: "relative" }}>
      {/* Doc picker popup */}
      {showDocPicker && (
        <div ref={pickerRef} style={{
          position: "absolute", bottom: "calc(100% + 8px)", left: 0,
          width: 260, maxHeight: 280, overflowY: "auto",
          background: "rgba(9,14,26,0.97)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 12,
          boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
          zIndex: 50,
          padding: "8px 0",
        }}>
          <div style={{
            padding: "6px 14px 10px",
            fontFamily: "var(--font-jetbrains-mono)", fontSize: 9,
            color: "#4a5568", letterSpacing: "0.08em", textTransform: "uppercase" as const,
          }}>
            {i.addDocsContext}
          </div>
          {docs.length === 0 && (
            <div style={{ padding: "8px 14px", fontSize: 12, color: "#4a5568" }}>
              {i.noDocuments}
            </div>
          )}
          {docs.map((doc) => {
            const selected = selectedDocIds.includes(doc.id);
            return (
              <button
                key={doc.id}
                type="button"
                onClick={() => onToggleDoc?.(doc.id)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 10,
                  padding: "8px 14px", background: "none", border: "none",
                  cursor: "pointer", textAlign: "left",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
              >
                <div style={{
                  width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                  border: `1.5px solid ${selected ? "#c9a55c" : "rgba(255,255,255,0.15)"}`,
                  background: selected ? "rgba(201,165,92,0.15)" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {selected && <span style={{ fontSize: 10, color: "#c9a55c" }}>✓</span>}
                </div>
                <span style={{
                  fontFamily: "var(--font-space-grotesk)", fontSize: 12,
                  color: selected ? "#ede8df" : "#8892a8",
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}>
                  {doc.name}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Image preview strip */}
      {imagePreviewUrl && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          marginBottom: 8, padding: "6px 8px",
          background: "rgba(12,18,32,0.8)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 10,
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imagePreviewUrl}
            alt="preview"
            style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 6, flexShrink: 0 }}
          />
          <span style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: 10, color: "#8892a8", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {pendingImage?.name ?? "image"}
          </span>
          <button
            type="button"
            onClick={clearImage}
            style={{
              width: 20, height: 20, borderRadius: 4, flexShrink: 0,
              background: "rgba(255,255,255,0.06)", border: "none",
              color: "#8892a8", cursor: "pointer", fontSize: 11,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Input container */}
      <div style={{
        background: "rgba(12,18,32,0.9)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 14,
        transition: "border-color 0.2s",
      }}
        onFocus={() => {}}
        onBlurCapture={() => {}}
      >
        {/* Input row */}
        <div style={{ display: "flex", alignItems: "center", gap: 0, padding: "10px 12px" }}>
          {/* Doc attach button */}
          <button
            type="button"
            title="Attach docs as context"
            onClick={() => docs.length > 0 && setShowDocPicker((p) => !p)}
            style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              background: selectedCount > 0 ? "rgba(201,165,92,0.12)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${selectedCount > 0 ? "rgba(201,165,92,0.3)" : "rgba(255,255,255,0.07)"}`,
              color: selectedCount > 0 ? "#c9a55c" : "#4a5568",
              cursor: docs.length > 0 ? "pointer" : "default",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.15s",
              position: "relative",
              marginRight: 10,
            }}
          >
            <DocIcon />
            {selectedCount > 0 && (
              <span style={{
                position: "absolute", top: -5, right: -5,
                width: 14, height: 14, borderRadius: "50%",
                background: "#c9a55c", color: "#060a14",
                fontFamily: "var(--font-jetbrains-mono)", fontSize: 8, fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {selectedCount}
              </span>
            )}
          </button>

          {/* Hidden image file input */}
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleImageInputChange}
          />

          {/* Image button */}
          <button
            type="button"
            title={i.attachImage}
            onClick={() => imageInputRef.current?.click()}
            style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              background: pendingImage ? "rgba(91,141,239,0.12)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${pendingImage ? "rgba(91,141,239,0.3)" : "rgba(255,255,255,0.07)"}`,
              color: pendingImage ? "#5b8def" : "#4a5568",
              cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.15s",
              marginRight: 10,
            }}
          >
            <CameraIcon />
          </button>

          {/* Text area */}
          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            disabled={disabled}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            onPaste={handlePaste}
            placeholder={placeholder ?? i.placeholder}
            style={{
              flex: 1, background: "none", border: "none", outline: "none",
              fontFamily: "var(--font-space-grotesk)", fontSize: 14,
              color: "#ede8df", resize: "none", maxHeight: 128, minHeight: 22,
              lineHeight: 1.55,
            }}
          />

          {/* Right: agent dots + send */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 10, flexShrink: 0 }}>
            {AGENT_DOTS.map((a) => (
              <span
                key={a.label}
                title={`${a.label} · ${a.title}`}
                style={{
                  width: 10, height: 10, borderRadius: "50%", flexShrink: 0,
                  background: a.color,
                  opacity: 0.65,
                  cursor: "default",
                  display: "inline-block",
                  boxShadow: `0 0 6px ${a.color}60`,
                  transition: "opacity 0.15s",
                }}
                onMouseEnter={(e) => { (e.target as HTMLElement).style.opacity = "1"; }}
                onMouseLeave={(e) => { (e.target as HTMLElement).style.opacity = "0.65"; }}
              />
            ))}

            <button
              type="button"
              aria-label="Send"
              onClick={submit}
              disabled={disabled || !text.trim()}
              style={{
                width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                marginLeft: 4,
                background: text.trim() && !disabled
                  ? "linear-gradient(135deg, #c9a55c, #a67c42)"
                  : "rgba(255,255,255,0.06)",
                border: "none",
                cursor: text.trim() && !disabled ? "pointer" : "default",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: text.trim() && !disabled ? "#060a14" : "#4a5568",
                fontWeight: 700, fontSize: 16,
                transition: "all 0.2s",
                boxShadow: text.trim() && !disabled ? "0 2px 12px rgba(201,165,92,0.3)" : "none",
              }}
            >
              →
            </button>
          </div>
        </div>

        {/* Footer hints */}
        {hint && (
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "0 12px 9px",
          }}>
            <span style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: 9, color: "#4a5568" }}>
              {i.shiftEnterHint}
            </span>
            <span style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: 9, color: "#4a5568" }}>
              {i.agentsActive}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
