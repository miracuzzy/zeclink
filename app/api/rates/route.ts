import { getRates } from "@/lib/rates";

export const dynamic = "force-dynamic";

export async function GET() {
  const r = await getRates();
  if (!r) return Response.json({ error: "Price feed unavailable" }, { status: 503 });
  return Response.json(r, { headers: { "Cache-Control": "public, max-age=60" } });
}
