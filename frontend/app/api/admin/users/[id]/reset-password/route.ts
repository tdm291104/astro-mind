import { type NextRequest } from "next/server";

const BACKEND = process.env.API_PROXY_TARGET ?? "http://localhost:8000";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.text();
  const cookie = req.headers.get("cookie") ?? "";
  const upstream = await fetch(
    `${BACKEND}/admin/users/${encodeURIComponent(params.id)}/reset-password`,
    {
      method: "POST",
      headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
      body,
    },
  );
  const data = await upstream.json().catch(() => ({ error: "upstream error" }));
  return Response.json(data, { status: upstream.status });
}
