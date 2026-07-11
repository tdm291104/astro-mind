import { type NextRequest } from "next/server";

const BACKEND = process.env.API_PROXY_TARGET ?? "http://localhost:8000";

export async function GET(req: NextRequest) {
  const cookie = req.headers.get("cookie") ?? "";
  const status = req.nextUrl.searchParams.get("status") ?? "pending";
  const upstream = await fetch(`${BACKEND}/admin/plan-requests?status=${status}`, {
    headers: { ...(cookie ? { cookie } : {}) },
  });
  const data = await upstream.json().catch(() => ({ error: "upstream error" }));
  return Response.json(data, { status: upstream.status });
}
