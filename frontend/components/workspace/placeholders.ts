// PLACEHOLDER data for the design foundation. Replace with real API data later:
//   HISTORY  -> SP2 (conversation persistence)
//   USAGE    -> SP3 (usage metering & quotas)
export const HISTORY = [
  { id: "1", kind: "chat", text: "Formation of neutron stars", pinned: false },
  { id: "2", kind: "report", text: "Weekly Exoplanet Report", pinned: true },
  { id: "3", kind: "search", text: "James Webb JWST 2024 papers", pinned: false },
  { id: "4", kind: "notebook", text: "NASA Artemis documentation Q&A", pinned: false },
  { id: "5", kind: "chat", text: "Dark matter distribution models", pinned: false },
] as const;

export const USAGE = {
  period: "USAGE · MAY 2026",
  plan: "FREE",
  tokens: { used: 12400, limit: 20000 },
  requests: { used: 18, limit: 25 },
};

