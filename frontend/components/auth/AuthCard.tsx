"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Starfield } from "@/components/landing/Starfield";
import { useAuth } from "@/lib/auth";

function AstroLogoAuth({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="3.5" fill="#c9a55c" />
      <circle cx="16" cy="16" r="8" stroke="#c9a55c" strokeWidth="0.6" opacity="0.35" />
      <circle cx="16" cy="16" r="13" stroke="#c9a55c" strokeWidth="0.4" opacity="0.15" />
      <circle cx="7" cy="9" r="1.3" fill="#ede8df" opacity="0.55" />
      <circle cx="25" cy="11" r="1" fill="#ede8df" opacity="0.45" />
      <circle cx="9" cy="24" r="1.1" fill="#ede8df" opacity="0.5" />
      <circle cx="24" cy="22" r="0.9" fill="#ede8df" opacity="0.4" />
      <line x1="7" y1="9" x2="16" y2="16" stroke="#ede8df" strokeWidth="0.4" opacity="0.25" />
      <line x1="25" y1="11" x2="16" y2="16" stroke="#ede8df" strokeWidth="0.4" opacity="0.25" />
      <line x1="9" y1="24" x2="16" y2="16" stroke="#ede8df" strokeWidth="0.4" opacity="0.25" />
      <line x1="24" y1="22" x2="16" y2="16" stroke="#ede8df" strokeWidth="0.4" opacity="0.25" />
      <line x1="7" y1="9" x2="9" y2="24" stroke="#ede8df" strokeWidth="0.3" opacity="0.15" />
      <line x1="25" y1="11" x2="24" y2="22" stroke="#ede8df" strokeWidth="0.3" opacity="0.15" />
    </svg>
  );
}

function EyeIcon({ open }: { open: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
      <path d="M1.5 8s2.5-4 6.5-4 6.5 4 6.5 4-2.5 4-6.5 4S1.5 8 1.5 8z" />
      <circle cx="8" cy="8" r="2" />
      {!open && <line x1="2" y1="2" x2="14" y2="14" />}
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
      <rect x="2" y="3.5" width="12" height="9" rx="2" />
      <polyline points="2,4.5 8,9 14,4.5" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
      <circle cx="8" cy="5.5" r="2.5" />
      <path d="M3 14c0-2.8 2.2-5 5-5s5 2.2 5 5" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
      <rect x="4" y="7" width="8" height="6" rx="1.5" />
      <path d="M5.5 7V5.5a2.5 2.5 0 015 0V7" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16">
      <path d="M15.5 8.2c0-.6-.1-1.1-.2-1.6H8v3h4.2c-.2 1-.7 1.8-1.5 2.3v1.9h2.4c1.4-1.3 2.4-3.2 2.4-5.6z" fill="#4285F4" />
      <path d="M8 16c2 0 3.7-.7 5-1.8l-2.4-1.9c-.7.5-1.6.7-2.6.7-2 0-3.7-1.3-4.3-3.2H1.2v2C2.5 14.2 5 16 8 16z" fill="#34A853" />
      <path d="M3.7 9.7c-.2-.5-.2-1 0-1.5v-2H1.2C.4 7.5 0 8.7 0 10s.4 2.5 1.2 3.7l2.5-2z" fill="#FBBC05" />
      <path d="M8 3.2c1.1 0 2.1.4 2.9 1.1l2.2-2.2C11.7.8 10 0 8 0 5 0 2.5 1.8 1.2 4.2l2.5 2c.6-1.8 2.3-3 4.3-3z" fill="#EA4335" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="#ede8df">
      <path d="M8 0C3.6 0 0 3.6 0 8c0 3.5 2.3 6.5 5.5 7.6.4.1.5-.2.5-.4v-1.4c-2.2.5-2.7-1.1-2.7-1.1-.4-.9-.9-1.2-.9-1.2-.7-.5.1-.5.1-.5.8.1 1.2.8 1.2.8.7 1.2 1.9.9 2.3.7.1-.5.3-.9.5-1.1-1.8-.2-3.7-.9-3.7-4 0-.9.3-1.6.8-2.1-.1-.2-.4-1 .1-2.1 0 0 .7-.2 2.2.8.6-.2 1.3-.3 2-.3s1.4.1 2 .3c1.5-1 2.2-.8 2.2-.8.4 1.1.2 1.9.1 2.1.5.6.8 1.3.8 2.1 0 3.1-1.9 3.8-3.7 4 .3.3.6.8.6 1.5v2.2c0 .2.1.5.6.4C13.7 14.5 16 11.5 16 8c0-4.4-3.6-8-8-8z" />
    </svg>
  );
}

function StyledInput({
  label, type = "text", placeholder, value, onChange, icon, rightEl,
}: {
  label: string; type?: string; placeholder: string; value: string;
  onChange: (v: string) => void; icon: React.ReactNode; rightEl?: React.ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{
        fontFamily: "var(--font-space-grotesk)", fontSize: 12,
        color: "#8892a8",
      }}>
        {label}
      </label>
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        background: focused ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.03)",
        border: `1px solid ${focused ? "rgba(201,165,92,0.35)" : "rgba(255,255,255,0.08)"}`,
        borderRadius: 10, padding: "10px 13px",
        transition: "border-color 0.2s, background 0.2s",
      }}>
        <span style={{ color: "#4a5568", display: "flex", flexShrink: 0 }}>{icon}</span>
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            flex: 1, background: "none", border: "none", outline: "none",
            fontFamily: "var(--font-space-grotesk)", fontSize: 14, color: "#ede8df",
            lineHeight: 1.4,
          }}
        />
        {rightEl}
      </div>
    </div>
  );
}

export default function AuthCard({ mode }: { mode: "login" | "register" }) {
  const { login, register } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<"login" | "register">(mode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const p = new URLSearchParams(window.location.search);
    const err = p.get("error");
    if (err === "oauth_not_configured") setError("OAuth chưa được cấu hình trên server.");
    else if (err === "google_denied" || err === "github_denied") setError("Đăng nhập bị hủy.");
    else if (err) setError("Đăng nhập thất bại. Vui lòng thử lại.");
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (tab === "login") {
        await login(email, password);
      } else {
        await register(email, password, name);
      }
      router.push("/chat");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setError(
        tab === "login"
          ? "Email hoặc mật khẩu không đúng"
          : msg.includes("409")
            ? "Email đã được đăng ký"
            : "Đăng ký thất bại (mật khẩu ≥ 8 ký tự)",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, position: "relative" }}>
      <Starfield />

      {/* Gold glow orb */}
      <div style={{
        position: "fixed", width: 600, height: 600, pointerEvents: "none", zIndex: 1,
        background: "radial-gradient(circle, rgba(201,165,92,0.10) 0%, transparent 68%)",
        top: "50%", left: "50%", transform: "translate(-50%, -50%)",
      }} />

      {/* Glass card */}
      <div style={{
        width: "min(420px, 100%)", position: "relative", zIndex: 2,
        background: "rgba(9,14,26,0.88)",
        backdropFilter: "blur(28px)", WebkitBackdropFilter: "blur(28px)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 20, padding: "40px 36px",
        boxShadow: "0 28px 80px rgba(0,0,0,0.55)",
      }}>

        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 32 }}>
          <AstroLogoAuth size={30} />
          <span style={{ fontFamily: "var(--font-instrument-serif)", fontSize: 22, color: "#ede8df" }}>
            Astro Mind
          </span>
        </div>

        {/* Tab switcher */}
        <div style={{
          display: "flex", marginBottom: 28,
          background: "rgba(255,255,255,0.03)",
          borderRadius: 10, padding: 3,
          border: "1px solid rgba(255,255,255,0.06)",
        }}>
          {(["login", "register"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => { setTab(t); setError(null); }}
              style={{
                flex: 1, padding: "9px 0", textAlign: "center",
                fontFamily: "var(--font-space-grotesk)", fontSize: 13, fontWeight: 600,
                color: tab === t ? "#060a14" : "#8892a8",
                background: tab === t ? "#c9a55c" : "transparent",
                border: "none", borderRadius: 8,
                cursor: "pointer", transition: "all 0.22s",
                letterSpacing: "0.02em",
              }}
            >
              {t === "login" ? "Sign In" : "Create Account"}
            </button>
          ))}
        </div>

        {/* Social login */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          {[
            { name: "Google", icon: <GoogleIcon /> },
            { name: "GitHub", icon: <GitHubIcon /> },
          ].map((s) => (
            <button
              key={s.name}
              type="button"
              onClick={() => { window.location.href = `/api/auth/${s.name.toLowerCase()}`; }}
              style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                padding: "10px 0", borderRadius: 10,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                fontFamily: "var(--font-space-grotesk)", fontSize: 13, fontWeight: 500,
                color: "#8892a8", cursor: "pointer", transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.07)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
                e.currentTarget.style.color = "#ede8df";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                e.currentTarget.style.color = "#8892a8";
              }}
            >
              {s.icon}
              <span>{s.name}</span>
            </button>
          ))}
        </div>

        {/* OR divider */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
          <span style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: 10, color: "#4a5568", letterSpacing: "0.06em" }}>OR</span>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
        </div>

        {/* Form */}
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {tab === "register" && (
            <StyledInput label="Full Name" placeholder="Your name" value={name} onChange={setName} icon={<UserIcon />} />
          )}
          <StyledInput label="Email" type="email" placeholder="you@university.edu" value={email} onChange={setEmail} icon={<MailIcon />} />
          <StyledInput
            label="Password"
            type={showPw ? "text" : "password"}
            placeholder="••••••••"
            value={password}
            onChange={setPassword}
            icon={<LockIcon />}
            rightEl={
              <button
                type="button"
                onClick={() => setShowPw((p) => !p)}
                style={{ color: "#4a5568", display: "flex", cursor: "pointer", background: "none", border: "none", padding: 0 }}
              >
                <EyeIcon open={showPw} />
              </button>
            }
          />

          {tab === "login" && (
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: -4 }}>
              <span style={{ fontFamily: "var(--font-space-grotesk)", fontSize: 12, color: "#c9a55c", cursor: "pointer" }}>
                Forgot password?
              </span>
            </div>
          )}

          {error && (
            <div style={{
              fontSize: 13, color: "#f87171",
              background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.15)",
              borderRadius: 8, padding: "10px 13px",
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            style={{
              width: "100%", padding: "13px 0", marginTop: 4,
              background: busy ? "rgba(201,165,92,0.55)" : "#c9a55c",
              color: "#060a14", border: "none", borderRadius: 10,
              fontFamily: "var(--font-space-grotesk)", fontSize: 14, fontWeight: 700,
              cursor: busy ? "not-allowed" : "pointer",
              transition: "all 0.2s", letterSpacing: "0.01em",
              boxShadow: busy ? "none" : "0 4px 20px rgba(201,165,92,0.2)",
            }}
          >
            {busy ? "Processing…" : tab === "login" ? "Sign In" : "Create Account"}
          </button>

          {tab === "register" && (
            <p style={{ fontSize: 11, color: "#4a5568", textAlign: "center", lineHeight: 1.55 }}>
              By creating an account you agree to our{" "}
              <span style={{ color: "#c9a55c", cursor: "pointer" }}>Terms</span>
              {" "}and{" "}
              <span style={{ color: "#c9a55c", cursor: "pointer" }}>Privacy Policy</span>.
            </p>
          )}
        </form>

        {/* Footer toggle */}
        <p style={{ marginTop: 22, textAlign: "center", fontSize: 12, color: "#4a5568" }}>
          {tab === "login" ? (
            <>
              Don&apos;t have an account?{" "}
              <span style={{ color: "#c9a55c", cursor: "pointer" }} onClick={() => { setTab("register"); setError(null); }}>
                Create one
              </span>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <span style={{ color: "#c9a55c", cursor: "pointer" }} onClick={() => { setTab("login"); setError(null); }}>
                Sign in
              </span>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
