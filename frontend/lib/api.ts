async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`);
  }
  return res.json();
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(path, { credentials: "include" });
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`);
  }
  return res.json();
}

export interface DocumentMeta {
  id: string;
  name: string;
  type: string;
  page_count: number;
}

export interface IngestStarted {
  job_id: string;
  status: string;
}

export interface IngestJob {
  job_id: string;
  status: "pending" | "processing" | "done" | "failed";
  source_name: string;
  doc_id: string | null;
  page_count: number | null;
  chunk_count: number | null;
  error: string | null;
}

export interface Citation {
  citation_id: number;
  doc_id: string;
  doc_name: string;
  page: number | null;
  excerpt: string;
  relevance_score: number;
  section: string | null;
  doc_type: string;
  source: "chunk" | "analysis";
}

export interface AskResult {
  answer: string;
  citations: Citation[];
  had_hits: boolean;
  answer_type: "factual_with_citation" | "no_citation" | "no_hits";
}

export function ask(query: string, docIds?: string[]): Promise<AskResult> {
  return postJson<AskResult>("/api/ask", { query, doc_ids: docIds ?? null });
}

export interface AssistantResponse {
  session_id: string;
  reply: string;
  route: string;
  citations: Citation[];
  fallback_query: string | null;
  title?: string;
  report_id?: string;
}

export interface ConversationSummary {
  id: string;
  title: string;
  pinned: boolean;
  updated_at: string;
  routes: string[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  route: string | null;
  citations: Citation[] | null;
  arxiv_papers?: ArxivPaper[] | null;
  web_sources?: WebSource[] | null;
  search_images?: SearchImage[] | null;
  image_url?: string | null;
}

export interface ConversationDetail {
  id: string;
  title: string;
  pinned: boolean;
  messages: ChatMessage[];
}

export interface PagedConversations {
  conversations: ConversationSummary[];
  has_more: boolean;
}

export function getConversations(limit = 10, offset = 0): Promise<PagedConversations> {
  return getJson<PagedConversations>(`/api/conversations?limit=${limit}&offset=${offset}`);
}

export function getConversation(id: string): Promise<ConversationDetail> {
  return getJson<ConversationDetail>(`/api/conversations/${encodeURIComponent(id)}`);
}

export async function setConversationPinned(id: string, pinned: boolean): Promise<void> {
  await fetch(`/api/conversations/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ pinned }),
    credentials: "include",
  });
}

export async function renameConversation(id: string, title: string): Promise<void> {
  await fetch(`/api/conversations/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title }),
    credentials: "include",
  });
}

export async function deleteConversation(id: string): Promise<void> {
  await fetch(`/api/conversations/${encodeURIComponent(id)}`, { method: "DELETE", credentials: "include" });
}

export function postAssistant(
  message: string,
  sessionId?: string | null,
  opts?: { mode?: string; doc_ids?: string[]; web?: boolean },
): Promise<AssistantResponse> {
  return postJson("/api/assistant", { message, session_id: sessionId ?? null, ...opts });
}

export function getDocuments(limit = 10, offset = 0): Promise<{ documents: DocumentMeta[]; has_more: boolean }> {
  return getJson(`/api/documents?limit=${limit}&offset=${offset}`);
}

async function postIngest(form: FormData): Promise<IngestStarted> {
  const res = await fetch(`/api/ingest`, { method: "POST", body: form, credentials: "include" });
  if (!res.ok) {
    throw new Error(`Ingest failed: ${res.status}`);
  }
  return res.json();
}

export function ingestFile(file: File): Promise<IngestStarted> {
  const form = new FormData();
  form.append("file", file);
  return postIngest(form);
}

export function ingestUrl(url: string): Promise<IngestStarted> {
  const form = new FormData();
  form.append("url", url);
  return postIngest(form);
}

export function getIngestStatus(jobId: string): Promise<IngestJob> {
  return getJson(`/api/ingest/${encodeURIComponent(jobId)}`);
}

export interface TopicRow {
  keyword: string;
  prev: number;
  recent: number;
  growth: number | null;
}

export interface TimelineByMethod {
  years: number[];
  series: Record<string, number[]>;
}

export interface ReportReference {
  source: "arxiv" | "web" | "notebook";
  title: string;
  url: string;
  doc_name: string;
  page: number | null;
  excerpt: string;
}

export interface TopAuthor {
  name: string;
  count: number;
}

export interface SearchImage {
  title: string;
  url: string;
}

export interface DetectedObject {
  class_name: string;
  sub_type: string;
  confidence: string;
  description: string;
}

export interface DiscoveryImage {
  image_url: string | null;
  detected_objects: DetectedObject[];
  morphology_context: string | null;
}

export interface DiscoveryData {
  session_title: string;
  images: DiscoveryImage[];
}

export interface TrendsReport {
  generating?: boolean;
  report_type?: "research" | "trending" | "discovery";
  prev_year?: number;
  recent_year?: number;
  topics: { rows: TopicRow[]; analysis: string };
  timeline: {
    rows: { year: number; count: number }[];
    by_method: TimelineByMethod;
    analysis: string;
  };
  interest: { series: Record<string, number[]>; text: string };
  research_text?: string;
  references?: ReportReference[];
  top_authors?: TopAuthor[];
  keywords?: string[];
  discovery?: DiscoveryData | null;
  search_images?: SearchImage[];
  generated_at?: string;
}

export interface ReportSummary {
  id: string;
  title: string;
  created_at: string;
  report_type?: "research" | "trending" | "discovery";
}

export interface ReportDetail {
  id: string;
  title: string;
  created_at: string;
  payload: TrendsReport;
}

export interface DocumentView {
  id: string;
  name: string;
  type: string;
  kind: "pdf" | "text" | "url" | "image";
  text?: string;
  file_url?: string;
  url?: string;
  image_url?: string;
}

export function getReports(limit = 10, offset = 0): Promise<{ reports: ReportSummary[]; has_more: boolean }> {
  return getJson(`/api/reports?limit=${limit}&offset=${offset}`);
}

export async function deleteReport(id: string): Promise<void> {
  await fetch(`/api/reports/${encodeURIComponent(id)}`, { method: "DELETE", credentials: "include" });
}

export async function renameReport(id: string, title: string): Promise<void> {
  await fetch(`/api/reports/${encodeURIComponent(id)}`, {
    method: "PATCH", credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title }),
  });
}

export async function deleteDocument(id: string): Promise<void> {
  await fetch(`/api/documents/${encodeURIComponent(id)}`, { method: "DELETE", credentials: "include" });
}

export async function renameDocument(id: string, name: string): Promise<void> {
  await fetch(`/api/documents/${encodeURIComponent(id)}`, {
    method: "PATCH", credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name }),
  });
}

export function getReport(id: string): Promise<ReportDetail> {
  return getJson(`/api/reports/${encodeURIComponent(id)}`);
}

export interface FitsHeader {
  OBJECT?: string;
  TELESCOP?: string;
  INSTRUME?: string;
  FILTER?: string;
  "DATE-OBS"?: string;
  EXPTIME?: number;
  RA?: number | string;
  DEC?: number | string;
  NAXIS1?: number;
  NAXIS2?: number;
  BUNIT?: string;
  OBSERVER?: string;
  ORIGIN?: string;
  [key: string]: string | number | boolean | undefined;
}

export function getFitsHeader(id: string): Promise<{ header: FitsHeader }> {
  return getJson<{ header: FitsHeader }>(`/api/documents/${encodeURIComponent(id)}/fits-header`);
}

export async function getDocumentView(id: string): Promise<DocumentView> {
  const raw = await getJson<DocumentView>(`/api/documents/${encodeURIComponent(id)}/view`);
  const withApiPrefix = (p?: string) =>
    p && !p.startsWith("/api") ? `/api${p}` : p;
  return {
    ...raw,
    file_url: withApiPrefix(raw.file_url),
    image_url: withApiPrefix(raw.image_url),
  };
}

export interface CelestialObject {
  name: string;
  type: string;
  properties: Record<string, string | number>;
  page: number | null;
  section: string | null;
}

export interface ExtractedTable {
  title: string;
  summary: string;
  key_rows: string[];
  page: number | null;
  section: string | null;
}

export interface ExtractedFormula {
  expression: string;
  context: string;
  meaning: string;
  page: number | null;
  section: string | null;
}

export interface ReferenceItem {
  paper: string;
  citation_key: string;
  link: string;
}

export interface ImportantValue {
  name: string;
  value: string;
  unit: string;
  context: string;
  page: number | null;
}

export interface FitsAnalysis {
  object_identification: string;
  coordinates: string;
  telescope_instrument: string;
  filters: string;
  observing_conditions: string;
  scientific_interpretation: string;
}

export interface DocumentAnalysisData {
  document_type: string;
  overall_summary: string;
  key_astronomy_insights: string[];
  celestial_objects: CelestialObject[];
  tables_extracted: ExtractedTable[];
  formulas: ExtractedFormula[];
  references: ReferenceItem[];
  important_values: ImportantValue[];
  research_gaps: string[];
  suggested_questions: string[];
  fits_analysis: FitsAnalysis | null;
}

export interface DocumentAnalysis {
  status: "pending" | "processing" | "done" | "failed";
  analysis: DocumentAnalysisData | null;
  error: string | null;
  model: string | null;
}

export function getDocumentAnalysis(id: string): Promise<DocumentAnalysis> {
  return getJson<DocumentAnalysis>(`/api/documents/${encodeURIComponent(id)}/analysis`);
}

export interface UsageSummary {
  period: string;
  plan: string;
  tokens: { used: number; limit: number | null };
  requests: { used: number; limit: number | null };
}

export function getUsage(): Promise<UsageSummary> {
  return getJson<UsageSummary>("/api/usage");
}

export interface User {
  id: string;
  email: string;
  display_name: string;
  role: "user" | "admin";
  plan: "free" | "pro" | "team";
  status: "active" | "banned";
}

export function register(email: string, password: string, displayName: string): Promise<User> {
  return postJson<User>("/api/auth/register", { email, password, display_name: displayName });
}

export function login(email: string, password: string): Promise<User> {
  return postJson<User>("/api/auth/login", { email, password });
}

export async function logout(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
}

export async function me(): Promise<User | null> {
  const res = await fetch("/api/auth/me", { credentials: "include" });
  if (!res.ok) return null;
  return res.json();
}

export interface PublicSource {
  key: string;
  name: string;
  icon: string;
  endpoint: string;
  enabled: boolean;
}

export interface AdminSource extends PublicSource {
  last_status: "ok" | "error" | null;
  last_latency_ms: number | null;
  last_checked_at: string | null;
}

export interface SourceTestResult {
  key: string;
  status: "ok" | "error";
  latency_ms: number;
  checked_at: string;
}

export function getSources(): Promise<{ sources: PublicSource[] }> {
  return getJson<{ sources: PublicSource[] }>("/api/sources");
}

export function getAdminSources(): Promise<{ sources: AdminSource[] }> {
  return getJson<{ sources: AdminSource[] }>("/api/admin/sources");
}

export async function setSourceEnabled(
  key: string,
  enabled: boolean,
): Promise<{ key: string; enabled: boolean }> {
  const res = await fetch(`/api/admin/sources/${encodeURIComponent(key)}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ enabled }),
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

export async function testSource(key: string): Promise<SourceTestResult> {
  const res = await fetch(`/api/admin/sources/${encodeURIComponent(key)}/test`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

export interface AdminOverview {
  kpis: {
    total_users: number;
    new_users_7d: number;
    tokens: { this_month: number; last_month: number };
    requests: { today: number; avg_7d: number };
    cost: { this_month: number; rate_per_1k: number };
  };
  request_volume: { day: string; requests: number; tokens: number; cost: number }[];
  feature_usage: { feature: string; tokens: number; pct: number }[];
  alerts: { tone: "danger" | "amber"; title: string; detail: string }[];
}

export interface AdminUser {
  id: string;
  email: string;
  display_name: string;
  role: "user" | "admin";
  plan: "free" | "pro" | "team";
  status: "active" | "banned";
  tokens_used: number;
  token_limit: number | null;
  created_at: string;
  last_login_at: string | null;
}

export interface AdminPlan {
  name: string;
  tokens_per_month: number | null;
  requests_per_day: number | null;
  docs_per_notebook: number | null;
}

export function getAdminOverview(): Promise<AdminOverview> {
  return getJson<AdminOverview>("/api/admin/overview");
}

export function getAdminUsers(): Promise<{ users: AdminUser[] }> {
  return getJson<{ users: AdminUser[] }>("/api/admin/users");
}

export async function updateUser(
  id: string,
  patch: { status?: "active" | "banned"; plan?: "free" | "pro" | "team" },
): Promise<AdminUser> {
  const res = await fetch(`/api/admin/users/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(patch),
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

export function getAdminPlans(): Promise<{ plans: AdminPlan[] }> {
  return getJson<{ plans: AdminPlan[] }>("/api/admin/plans");
}

export async function updatePlan(
  name: string,
  limits: { tokens_per_month: number | null; requests_per_day: number | null; docs_per_notebook: number | null },
): Promise<AdminPlan> {
  const res = await fetch(`/api/admin/plans/${encodeURIComponent(name)}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(limits),
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

// ─── Agentic SSE types ───────────────────────────────────────────────────────

export type AgentEventType =
  | "thinking"
  | "action"
  | "observe"
  | "text_delta"
  | "done"
  | "error";

export interface ThinkingAgentEvent {
  type: "thinking";
  preview: string;
}

export interface ActionAgentEvent {
  type: "action";
  tool: string;
  args: Record<string, unknown>;
}

export interface ObserveAgentEvent {
  type: "observe";
  summary: string;
}

export interface TextDeltaAgentEvent {
  type: "text_delta";
  delta: string;
}

export interface ArxivPaper {
  title: string;
  authors: string;
  summary: string;
  published: string;
  link: string;
}

export interface WebSource {
  title: string;
  url: string;
  content: string;
}

export interface DoneAgentEvent {
  type: "done";
  session_id?: string;
  route: string;
  citations: Citation[];
  arxiv_papers?: ArxivPaper[];
  web_sources?: WebSource[];
  search_images?: SearchImage[];
  title?: string;
  report_id?: string | null;
  suggested_action?: { type: string } | null;
}

export interface ErrorAgentEvent {
  type: "error";
  message: string;
}

export async function shareConversation(convId: string): Promise<{ token: string }> {
  return postJson<{ token: string }>(
    `/api/conversations/${encodeURIComponent(convId)}/share`,
    {},
  );
}

export type AgentEvent =
  | ThinkingAgentEvent
  | ActionAgentEvent
  | ObserveAgentEvent
  | TextDeltaAgentEvent
  | DoneAgentEvent
  | ErrorAgentEvent;

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
  });
}

export async function* streamConverse(
  message: string,
  opts?: {
    sessionId?: string | null;
    mode?: string;
    doc_ids?: string[];
    dry_run?: boolean;
    image?: File | null;
    locale?: string | null;
  },
): AsyncGenerator<AgentEvent> {
  let imageData: string | null = null;
  let imageType: string | null = null;
  if (opts?.image) {
    imageData = await fileToBase64(opts.image);
    imageType = opts.image.type || "image/jpeg";
  }

  const res = await fetch("/api/converse", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      message,
      session_id: opts?.sessionId ?? null,
      mode: opts?.mode ?? null,
      doc_ids: opts?.doc_ids ?? null,
      dry_run: opts?.dry_run ?? false,
      image_data: imageData,
      image_type: imageType,
      locale: opts?.locale ?? null,
    }),
  });

  if (!res.ok || !res.body) {
    throw new Error(`Converse failed: ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop()!;
    for (const part of parts) {
      if (part.startsWith("data: ")) {
        try {
          yield JSON.parse(part.slice(6)) as AgentEvent;
        } catch {
          // skip malformed events
        }
      }
    }
  }
}

export async function subscribeNewsletter(email: string): Promise<{ ok: boolean }> {
  return postJson<{ ok: boolean }>("/api/newsletter", { email });
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<{ ok: boolean }> {
  return postJson<{ ok: boolean }>("/api/auth/change-password", {
    current_password: currentPassword,
    new_password: newPassword,
  });
}

export async function adminResetPassword(
  userId: string,
  newPassword: string,
): Promise<{ ok: boolean }> {
  return postJson<{ ok: boolean }>(
    `/api/admin/users/${encodeURIComponent(userId)}/reset-password`,
    { new_password: newPassword },
  );
}

export interface UserUsageHistory {
  volume: { day: string; requests: number; tokens: number }[];
  feature_usage: { feature: string; tokens: number; pct: number }[];
}

export interface PlanRequest {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  requested_plan: string;
  message: string | null;
  status: string;
  created_at: string;
}

export function getUserUsageHistory(days = 14): Promise<UserUsageHistory> {
  return getJson<UserUsageHistory>(`/api/usage/history?days=${days}`);
}

export async function createPlanRequest(requestedPlan: string, message: string): Promise<{ id: string }> {
  return postJson<{ id: string }>("/api/plan-requests", { requested_plan: requestedPlan, message });
}

export function getAdminPlanRequests(status = "pending"): Promise<{ requests: PlanRequest[] }> {
  return getJson<{ requests: PlanRequest[] }>(`/api/admin/plan-requests?status=${status}`);
}

export async function dismissPlanRequest(id: string): Promise<void> {
  const res = await fetch(`/api/admin/plan-requests/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ status: "dismissed" }),
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
}
