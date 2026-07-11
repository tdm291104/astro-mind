import { type NextRequest } from "next/server";

const BACKEND = process.env.API_PROXY_TARGET ?? "http://localhost:8000";

export async function GET(req: NextRequest) {
  const cookie = req.headers.get("cookie") ?? "";
  const days = req.nextUrl.searchParams.get("days") ?? "14";
  const upstream = await fetch(`${BACKEND}/usage/history?days=${days}`, {
    headers: { ...(cookie ? { cookie } : {}) },
  });
  const data = await upstream.json().catch(() => ({ error: "upstream error" }));
  return Response.json(data, { status: upstream.status });
}
