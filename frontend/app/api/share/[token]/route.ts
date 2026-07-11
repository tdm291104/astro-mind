import { type NextRequest } from "next/server";

const BACKEND = process.env.API_PROXY_TARGET ?? "http://localhost:8000";

export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const upstream = await fetch(`${BACKEND}/share/${encodeURIComponent(params.token)}`);
  const data = await upstream.json().catch(() => ({ error: "upstream error" }));
  return Response.json(data, { status: upstream.status });
}
