/**
 * 资产字典同步 API
 *
 * 基于 Market Provider 架构，支持按市场或全量同步。
 *
 * Query Parameters:
 * - market: 市场 ID（CN/US/HK/all），默认 all
 * - minMarketCap: 美股最小市值门槛（美元），默认 10 亿
 *
 * Examples:
 * - GET /api/cron/sync-assets                     -> 同步所有市场
 * - GET /api/cron/sync-assets?market=CN           -> 仅同步 A 股/基金
 * - GET /api/cron/sync-assets?market=US           -> 仅同步美股/ETF
 * - GET /api/cron/sync-assets?market=HK           -> 仅同步港股
 * - GET /api/cron/sync-assets?minMarketCap=0      -> 美股无市值限制
 */

import {
  syncMarketDimensions,
  syncAllAssetDimensions,
  getRegisteredMarkets,
} from "@/workers/sync";
import { loggers } from "@/lib/logger";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 分钟，支持全量同步

const log = loggers.cron.syncAssets;

function verifyCronAuth(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (process.env.NODE_ENV === "production" && !cronSecret) {
    log.error("CRON_SECRET not configured in production");
    return false;
  }

  if (cronSecret) {
    return authHeader === `Bearer ${cronSecret}`;
  }

  return process.env.NODE_ENV !== "production";
}

export async function GET(request: Request) {
  if (!verifyCronAuth(request)) {
    log.warn("Unauthorized request attempt");
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const market = searchParams.get("market")?.toUpperCase() || "ALL";
  const minMarketCapStr = searchParams.get("minMarketCap");
  const minMarketCap = minMarketCapStr
    ? parseInt(minMarketCapStr, 10)
    : 1_000_000_000;

  const startTime = Date.now();

  try {
    log.info("Starting sync job", { market, minMarketCap });

    let result;

    if (market === "ALL") {
      // 同步所有已启用的市场
      result = await syncAllAssetDimensions({ minMarketCap });
    } else {
      // 同步单个市场
      const markets = getRegisteredMarkets();
      const validMarket = markets.find((m) => m.id === market);

      if (!validMarket) {
        return NextResponse.json(
          {
            success: false,
            error: `Unknown market: ${market}. Available: ${markets.map((m) => m.id).join(", ")}`,
          },
          { status: 400 }
        );
      }

      const marketResult = await syncMarketDimensions(market, {
        minMarketCap: market === "US" ? minMarketCap : undefined,
      });

      result = { [market.toLowerCase()]: marketResult };
    }

    const duration = Date.now() - startTime;

    log.info("Sync job completed", {
      duration_ms: duration,
      market,
      minMarketCap,
      result,
    });

    return NextResponse.json({
      success: true,
      duration_ms: duration,
      market,
      minMarketCap,
      ...result,
    });
  } catch (error) {
    const duration = Date.now() - startTime;

    log.error("Sync job failed", {
      duration_ms: duration,
      market,
      error: String(error),
    });

    return NextResponse.json(
      {
        success: false,
        error: String(error),
        duration_ms: duration,
      },
      { status: 500 }
    );
  }
}
