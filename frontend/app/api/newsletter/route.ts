import { type NextRequest } from "next/server";

const BACKEND = process.env.API_PROXY_TARGET ?? "http://localhost:8000";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const upstream = await fetch(`${BACKEND}/newsletter/subscribe`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
  const data = await upstream.json().catch(() => ({ error: "upstream error" }));
  return Response.json(data, { status: upstream.status });
}
