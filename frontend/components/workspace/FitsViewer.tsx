"use client";

import { useEffect, useRef, useState } from "react";

import { getFitsHeader, type FitsHeader } from "@/lib/api";

const COLORMAPS = ["magma", "viridis", "inferno", "plasma", "hot", "gray"] as const;
const STRETCHES = ["linear", "log", "sqrt"] as const;
type Colormap = (typeof COLORMAPS)[number];
type Stretch = (typeof STRETCHES)[number];

const HEADER_DISPLAY = [
  { key: "OBJECT",   label: "Object" },
  { key: "TELESCOP", label: "Telescope" },
  { key: "INSTRUME", label: "Instrument" },
  { key: "FILTER",   label: "Filter" },
  { key: "DATE-OBS", label: "Date obs." },
  { key: "EXPTIME",  label: "Exp. time" },
  { key: "RA",       label: "RA" },
  { key: "DEC",      label: "Dec" },
  { key: "NAXIS1",   label: "Width px" },
  { key: "NAXIS2",   label: "Height px" },
  { key: "BUNIT",    label: "Unit" },
  { key: "OBSERVER", label: "Observer" },
  { key: "ORIGIN",   label: "Origin" },
];

function SelectControl({
  label, value, options, onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{
        fontFamily: "var(--font-jetbrains-mono)", fontSize: 9,
        color: "#4a5568", letterSpacing: "0.08em", textTransform: "uppercase" as const,
      }}>
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 6, padding: "3px 8px",
          fontFamily: "var(--font-jetbrains-mono)", fontSize: 11,
          color: "#ede8df", cursor: "pointer", outline: "none",
        }}
      >
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function IconBtn({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      style={{
        width: 28, height: 28, borderRadius: 7,
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.08)",
        color: "#8892a8", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "var(--font-jetbrains-mono)", fontSize: 13,
        transition: "all 0.15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(255,255,255,0.1)";
        e.currentTarget.style.color = "#ede8df";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "rgba(255,255,255,0.05)";
        e.currentTarget.style.color = "#8892a8";
      }}
    >
      {children}
    </button>
  );
}

export default function FitsViewer({
  docId, name, baseImageUrl,
}: {
  docId: string;
  name: string;
  baseImageUrl: string;
}) {
  const [colormap, setColormap] = useState<Colormap>("magma");
  const [stretch, setStretch] = useState<Stretch>("linear");
  const [header, setHeader] = useState<FitsHeader | null>(null);
  const [headerOpen, setHeaderOpen] = useState(true);
  const [imgLoading, setImgLoading] = useState(true);

  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragOrigin = useRef({ x: 0, y: 0, ox: 0, oy: 0 });

  useEffect(() => {
    void getFitsHeader(docId)
      .then((r) => setHeader(r.header))
      .catch(() => setHeader(null));
  }, [docId]);

  // Reset loading indicator when colormap/stretch changes
  useEffect(() => { setImgLoading(true); }, [colormap, stretch]);

  const imageUrl = `${baseImageUrl}?colormap=${colormap}&stretch=${stretch}`;

  function zoom(factor: number) {
    setScale((s) => Math.max(0.1, Math.min(12, s * factor)));
  }

  function resetView() {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }

  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    zoom(e.deltaY > 0 ? 0.88 : 1.14);
  }

  function onPointerDown(e: React.PointerEvent) {
    isDragging.current = true;
    dragOrigin.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!isDragging.current) return;
    setOffset({
      x: dragOrigin.current.ox + (e.clientX - dragOrigin.current.x),
      y: dragOrigin.current.oy + (e.clientY - dragOrigin.current.y),
    });
  }

  function onPointerUp() {
    isDragging.current = false;
  }

  const visibleHeaders = HEADER_DISPLAY.filter(({ key }) => header && header[key] != null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, height: "100%" }}>

      {/* Controls bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", flexShrink: 0,
        padding: "8px 12px",
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 10,
      }}>
        <SelectControl label="Colormap" value={colormap} options={COLORMAPS} onChange={(v) => setColormap(v as Colormap)} />
        <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.08)" }} />
        <SelectControl label="Stretch" value={stretch} options={STRETCHES} onChange={(v) => setStretch(v as Stretch)} />
        <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.08)" }} />

        {/* Zoom controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <IconBtn onClick={() => zoom(1.2)} title="Zoom in">+</IconBtn>
          <span style={{
            fontFamily: "var(--font-jetbrains-mono)", fontSize: 10, color: "#8892a8",
            minWidth: 36, textAlign: "center",
          }}>
            {Math.round(scale * 100)}%
          </span>
          <IconBtn onClick={() => zoom(1 / 1.2)} title="Zoom out">−</IconBtn>
          <IconBtn onClick={resetView} title="Reset view">⌂</IconBtn>
        </div>

        <div style={{ flex: 1 }} />

        {/* Header toggle */}
        {visibleHeaders.length > 0 && (
          <button
            type="button"
            onClick={() => setHeaderOpen((o) => !o)}
            style={{
              fontFamily: "var(--font-jetbrains-mono)", fontSize: 10,
              color: headerOpen ? "#c9a55c" : "#4a5568",
              background: "none", border: "none", cursor: "pointer",
              letterSpacing: "0.05em",
              transition: "color 0.15s",
            }}
          >
            {headerOpen ? "▸ HIDE INFO" : "▸ SHOW INFO"}
          </button>
        )}
      </div>

      {/* Main area */}
      <div style={{ display: "flex", gap: 12, flex: 1, minHeight: 0 }}>

        {/* Image canvas */}
        <div
          style={{
            flex: 1, position: "relative", overflow: "hidden",
            background: "#000", borderRadius: 12,
            cursor: isDragging.current ? "grabbing" : "grab",
            userSelect: "none",
          }}
          onWheel={onWheel}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          {imgLoading && (
            <div style={{
              position: "absolute", inset: 0, zIndex: 2,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "#000",
            }}>
              <div style={{
                fontFamily: "var(--font-jetbrains-mono)", fontSize: 11, color: "#4a5568",
                letterSpacing: "0.08em",
              }}>
                Rendering…
              </div>
            </div>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={name}
            draggable={false}
            onLoad={() => setImgLoading(false)}
            style={{
              position: "absolute",
              top: "50%", left: "50%",
              transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${scale})`,
              transformOrigin: "center center",
              maxWidth: "none",
              display: "block",
              opacity: imgLoading ? 0 : 1,
              transition: "opacity 0.2s",
            }}
          />

          {/* Scale hint */}
          <div style={{
            position: "absolute", bottom: 10, right: 12, zIndex: 3,
            fontFamily: "var(--font-jetbrains-mono)", fontSize: 9,
            color: "rgba(255,255,255,0.25)", letterSpacing: "0.06em",
            pointerEvents: "none",
          }}>
            Scroll to zoom · Drag to pan
          </div>
        </div>

        {/* Header metadata panel */}
        {headerOpen && visibleHeaders.length > 0 && (
          <div style={{
            width: 192, flexShrink: 0, overflowY: "auto",
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 12, padding: "12px 0",
          }}>
            <div style={{
              fontFamily: "var(--font-jetbrains-mono)", fontSize: 9,
              color: "#4a5568", letterSpacing: "0.09em", textTransform: "uppercase" as const,
              padding: "0 14px 10px",
            }}>
              FITS Header
            </div>
            {visibleHeaders.map(({ key, label }) => (
              <div key={key} style={{
                padding: "5px 14px",
                borderTop: "1px solid rgba(255,255,255,0.04)",
              }}>
                <div style={{
                  fontFamily: "var(--font-jetbrains-mono)", fontSize: 9,
                  color: "#4a5568", marginBottom: 2,
                }}>
                  {label}
                </div>
                <div style={{
                  fontFamily: "var(--font-space-grotesk)", fontSize: 12,
                  color: "#ede8df", wordBreak: "break-all",
                }}>
                  {String(header![key])}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
