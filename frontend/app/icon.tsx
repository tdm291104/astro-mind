import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#060a14",
          borderRadius: 8,
        }}
      >
        <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
          {/* Outer orbit ring */}
          <circle cx="16" cy="16" r="13" stroke="#c9a55c" strokeWidth="0.5" opacity="0.2" />
          {/* Inner orbit ring */}
          <circle cx="16" cy="16" r="8" stroke="#c9a55c" strokeWidth="0.7" opacity="0.4" />
          {/* Center dot */}
          <circle cx="16" cy="16" r="3.5" fill="#c9a55c" />
          {/* Star nodes */}
          <circle cx="7" cy="9" r="1.4" fill="#ede8df" opacity="0.7" />
          <circle cx="25" cy="11" r="1.1" fill="#ede8df" opacity="0.6" />
          <circle cx="9" cy="24" r="1.2" fill="#ede8df" opacity="0.65" />
          <circle cx="24" cy="22" r="1.0" fill="#ede8df" opacity="0.55" />
          {/* Constellation lines */}
          <line x1="7" y1="9" x2="16" y2="16" stroke="#ede8df" strokeWidth="0.5" opacity="0.3" />
          <line x1="25" y1="11" x2="16" y2="16" stroke="#ede8df" strokeWidth="0.5" opacity="0.3" />
          <line x1="9" y1="24" x2="16" y2="16" stroke="#ede8df" strokeWidth="0.5" opacity="0.3" />
          <line x1="24" y1="22" x2="16" y2="16" stroke="#ede8df" strokeWidth="0.5" opacity="0.3" />
          <line x1="7" y1="9" x2="9" y2="24" stroke="#ede8df" strokeWidth="0.4" opacity="0.15" />
          <line x1="25" y1="11" x2="24" y2="22" stroke="#ede8df" strokeWidth="0.4" opacity="0.15" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
