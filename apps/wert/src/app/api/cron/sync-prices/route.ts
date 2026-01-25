import { syncPriceWorker } from "@/workers/sync";
import { loggers } from "@/lib/logger";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
export const maxDuration = 120; // 价格同步可能需要更长时间

const log = loggers.cron.syncPrices;

function verifyCronAuth(request: Request): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (process.env.NODE_ENV === 'production' && !cronSecret) {
    log.error("CRON_SECRET not configured in production");
    return false;
  }

  if (cronSecret) {
    return authHeader === `Bearer ${cronSecret}`;
  }

  return process.env.NODE_ENV !== 'production';
}

export async function GET(request: Request) {
  if (!verifyCronAuth(request)) {
    log.warn("Unauthorized request attempt");
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const startTime = Date.now();

  try {
    log.info("Starting asset price sync");

    const result = await syncPriceWorker();

    const duration = Date.now() - startTime;
    log.info("Asset price sync completed", { duration_ms: duration, ...result });

    return NextResponse.json({ ok: true, duration_ms: duration, ...result });
  } catch (error) {
    const duration = Date.now() - startTime;
    log.error("Asset price sync failed", { duration_ms: duration, error: String(error) });

    return NextResponse.json(
      { ok: false, error: String(error), duration_ms: duration },
      { status: 500 }
    );
  }
}
