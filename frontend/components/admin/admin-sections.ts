export type Section =
  | "overview" | "users" | "usage" | "sources" | "quotas";

export const SECTIONS: Section[] = [
  "overview", "users", "usage", "sources", "quotas",
];

interface NavItem { key: Section; icon: string; label: string; group: string; badge?: string; badgeTone?: "cyan" | "danger" | "amber"; }
export const NAV: NavItem[] = [
  { key: "overview", icon: "📡", label: "Overview",     group: "Overview" },
  { key: "users",    icon: "👥", label: "Users",        group: "Overview" },
  { key: "usage",    icon: "📈", label: "Usage",        group: "Overview" },
  { key: "sources",  icon: "🌐", label: "Data Sources", group: "Overview" },
  { key: "quotas",   icon: "⏱",  label: "Quotas",       group: "Overview" },
];

export const TITLES: Record<Section, { title: string; sub: string }> = {
  overview: { title: "Overview", sub: "Platform metrics — last 30 days" },
  users: { title: "Users", sub: "8 registered users" },
  usage: { title: "Usage Analytics", sub: "Token and request consumption over time" },
  sources: { title: "Data Sources", sub: "Manage external APIs and data connections" },
  quotas: { title: "Quota Configuration", sub: "Set resource limits per plan" },
};
