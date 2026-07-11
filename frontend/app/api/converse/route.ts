import { type NextRequest } from "next/server";

const BACKEND = process.env.API_PROXY_TARGET ?? "http://localhost:8000";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const cookie = req.headers.get("cookie") ?? "";

  const upstream = await fetch(`${BACKEND}/converse`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body,
  });

  if (!upstream.ok || !upstream.body) {
    return new Response(upstream.body, { status: upstream.status });
  }

  // Stream the SSE body straight through with headers that prevent buffering.
  return new Response(upstream.body, {
    status: 200,
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",   // nginx / reverse proxies
      connection: "keep-alive",
    },
  });
}
