import { type NextRequest } from "next/server";

const BACKEND = process.env.API_PROXY_TARGET ?? "http://localhost:8000";

export async function POST(req: NextRequest) {
  const cookie = req.headers.get("cookie") ?? "";
  const body = await req.text();
  const upstream = await fetch(`${BACKEND}/plan-requests`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
    body,
  });
  const data = await upstream.json().catch(() => ({ error: "upstream error" }));
  return Response.json(data, { status: upstream.status });
}
