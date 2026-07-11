export type Mode = "chat" | "search" | "notebook" | "report";
export const MODES: Mode[] = ["chat", "search", "notebook", "report"];

/** Parses a leading @command. Returns {mode, rest} where rest is the text after the token, or null. */
export function parseModeCommand(text: string): { mode: Mode; rest: string } | null {
  const m = text.trim().match(/^@(assistant|chat|search|notebook|report)\b/i);
  if (!m) return null;
  const k = m[1].toLowerCase();
  const mode: Mode = k === "assistant" ? "chat" : (k as Mode);
  const rest = text.trim().slice(m[0].length).trim();
  return { mode, rest };
}
