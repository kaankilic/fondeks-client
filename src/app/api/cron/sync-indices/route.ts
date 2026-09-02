import { isAuthorizedCron, unauthorized } from "@/lib/api/auth";
import { syncMarketIndices } from "@/lib/ingest/indices";
import { isoDaysAgo, today } from "@/lib/ingest/jobs";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Index quotes. Re-reads a short window so a late bulletin — TCMB publishes
 * after 15:30 — is picked up by the next run.
 */
async function handle(request: Request) {
  if (!isAuthorizedCron(request)) return unauthorized();

  const days = Number(new URL(request.url).searchParams.get("days") ?? 5);

  try {
    const result = await syncMarketIndices({
      from: isoDaysAgo(Number.isFinite(days) ? days : 5),
      to: today(),
    });

    return Response.json(
      { ok: true, ...result.run },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[cron] sync-indices failed:", message);

    return Response.json(
      { ok: false, error: message },
      { status: 502, headers: { "cache-control": "no-store" } },
    );
  }
}

export const POST = handle;
export const GET = handle;
