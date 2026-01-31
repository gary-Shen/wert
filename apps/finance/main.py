import asyncio
import time
import pandas as pd
from fastapi import FastAPI, HTTPException, Query, Security, status
from fastapi.security import APIKeyHeader
import logging
from datetime import datetime
import os
from typing import List, Dict

from pypinyin import lazy_pinyin, Style

# 数据源管理器
from data_sources import DataSourceManager

# 多层缓存管理器
from cache_manager import MultiLayerCache

# 类型定义
from models import (
    PriceResponse,
    DimensionResponse,
    WarmupResponse,
    WarmupDetail,
    CacheStats,
    DataSourceStatus,
    DataSourceHealthInfo,
    HealthResponse,
    MessageResponse,
    BatchPricesRequest,
    BatchPriceItem,
    BatchPriceError,
    BatchPricesResponse,
)

# 配置日志
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# port 8001
app = FastAPI(title="Wert Data Sidecar", version="1.1.0")


# ============ 缓存配置 ============
# 多层缓存实例
multi_cache = MultiLayerCache()

# 数据源管理器实例
data_source_manager = DataSourceManager()


# ============ 请求限流 ============
class RateLimiter:
    """简单的请求限流器（异步版本）"""

    def __init__(self, min_interval: float = 0.5):
        self._last_request_time = 0.0
        self._min_interval = min_interval
        self._lock = asyncio.Lock()

    async def wait(self):
        async with self._lock:
            now = time.time()
            elapsed = now - self._last_request_time
            if elapsed < self._min_interval:
                sleep_time = self._min_interval - elapsed
                await asyncio.sleep(sleep_time)
            self._last_request_time = time.time()


# 全局限流器 - 每次请求间隔至少 0.5 秒
rate_limiter = RateLimiter(min_interval=0.5)


# ============ 安全配置 ============
API_KEY_NAME = "X-API-Key"
API_KEY = os.getenv("API_KEY", "sk-snapworth-dev-key-2026")

api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=False)


async def get_api_key(api_key_header: str = Security(api_key_header)):
    if api_key_header == API_KEY:
        return api_key_header
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Could not validate credentials",
    )


# ============ 业务逻辑 ============
def get_stock_prefix_from_symbol(symbol: str) -> str:
    """从完整代码中提取市场前缀"""
    if symbol.startswith(("sh", "sz", "bj")):
        return symbol[:2]
    return "sz"


def get_stock_prefix(code: str) -> str:
    """根据纯数字股票代码获取市场前缀"""
    code_str = str(code)
    if code_str.startswith("6"):
        return "sh"
    elif code_str.startswith("8") or code_str.startswith("4"):
        return "bj"
    else:
        return "sz"


# ============ API 路由 ============
@app.get(
    "/api/v1/stock/eod",
    response_model=PriceResponse,
    summary="获取股票收盘价",
    description="根据股票代码获取 A 股股票最新的当日收盘价（后复权）。支持上交所(sh)、深交所(sz)、北交所(bj)。",
)
async def get_stock_eod(
    symbol: str = Query(
        ..., description="股票代码，例如 sz000001、sh600519 或 bj830799"
    ),
    api_key: str = Security(get_api_key),
):
    # 1. L1: 检查内存缓存
    cache_key = f"stock:{symbol}"
    cached_result = multi_cache.get_memory(cache_key)
    if cached_result:
        return {**cached_result, "cached": True, "cache_level": "L1"}

    # 2. L2: 检查持久化缓存
    cached_result = multi_cache.get_price_persistent(symbol)
    if cached_result:
        # 回填到 L1
        multi_cache.set_memory(cache_key, cached_result, "stock")
        return {**cached_result, "cached": True, "cache_level": "L2"}

    # 3. L3: 从数据源获取（自动降级：Tushare -> AkShare）
    try:
        prefix = get_stock_prefix_from_symbol(symbol)
        code = symbol[2:] if symbol.startswith(("sh", "sz", "bj")) else symbol

        # 限流
        await rate_limiter.wait()

        # 使用数据源管理器获取数据
        stock_data, source_name = await data_source_manager.fetch_stock_data(
            code, prefix
        )

        if stock_data is None:
            raise HTTPException(status_code=404, detail="未找到该股票行情数据")

        result = {
            "symbol": stock_data.symbol,
            "price": stock_data.price,
            "date": stock_data.date,
            "source": source_name,
            "currency": stock_data.currency,
        }

        # 4. 写入多层缓存
        multi_cache.set_memory(cache_key, result, "stock")
        multi_cache.set_price_persistent(result)

        return {**result, "cached": False, "cache_level": "L3"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Stock Fetch Error [{symbol}]: {type(e).__name__}: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"获取股票数据失败: {type(e).__name__}"
        )


@app.get(
    "/api/v1/fund/nav",
    response_model=PriceResponse,
    summary="获取基金净值",
    description="根据基金代码获取公募基金最新的单位净值。",
)
async def get_fund_nav(
    code: str = Query(..., description="基金代码，例如 000001"),
    api_key: str = Security(get_api_key),
):
    # 基金 symbol 格式: 000001.OF
    symbol = f"{code}.OF" if not code.endswith(".OF") else code
    cache_key = f"fund:{code}"

    # 1. L1: 检查内存缓存
    cached_result = multi_cache.get_memory(cache_key)
    if cached_result:
        return {**cached_result, "cached": True, "cache_level": "L1"}

    # 2. L2: 检查持久化缓存
    cached_result = multi_cache.get_price_persistent(symbol)
    if cached_result:
        multi_cache.set_memory(cache_key, cached_result, "fund")
        return {**cached_result, "cached": True, "cache_level": "L2"}

    # 3. L3: 从数据源获取
    try:
        await rate_limiter.wait()

        fund_data, source_name = await data_source_manager.fetch_fund_data(code)

        if fund_data is None:
            raise HTTPException(status_code=404, detail="基金代码错误或无数据")

        result = {
            "symbol": fund_data.code,
            "price": fund_data.price,
            "date": fund_data.date,
            "source": source_name,
            "currency": fund_data.currency,
        }

        # 4. 写入多层缓存
        multi_cache.set_memory(cache_key, result, "fund")
        # 持久化时使用标准格式
        persistent_result = {**result, "symbol": symbol}
        multi_cache.set_price_persistent(persistent_result)

        return {**result, "cached": False, "cache_level": "L3"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Fund Fetch Error [{code}]: {type(e).__name__}: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"获取基金数据失败: {type(e).__name__}"
        )


@app.get("/api/v1/dim", response_model=List[DimensionResponse])
async def get_dimensions(api_key: str = Security(get_api_key)):
    """获取全量 A 股和公募基金的维度信息"""

    # 1. 检查内存缓存
    cache_key = "dim:all"
    cached_result = multi_cache.get_memory(cache_key)
    if cached_result:
        logger.info("Returning cached dimension data from L1")
        return cached_result

    # 2. 获取数据（自动降级：Tushare -> AkShare）
    try:
        await rate_limiter.wait()

        dimensions, source_name = await data_source_manager.fetch_dimensions()

        if not dimensions:
            raise HTTPException(status_code=500, detail="无法获取维度数据")

        # 转换为 DataFrame 以便统一处理拼音
        df_all = pd.DataFrame(
            [
                {
                    "symbol": d.symbol,
                    "name": d.name,
                    "assetType": d.asset_type,
                }
                for d in dimensions
            ]
        )

        # 生成拼音
        df_all["pinyin"] = df_all["name"].apply(lambda x: "".join(lazy_pinyin(x)))
        df_all["pinyinAbbr"] = df_all["name"].apply(
            lambda x: "".join(lazy_pinyin(x, style=Style.FIRST_LETTER))
        )

        result = df_all.to_dict(orient="records")

        # 3. 写入多层缓存
        multi_cache.set_memory(cache_key, result, "dim")
        multi_cache.set_dimensions_persistent(result)
        logger.info(f"Dimension data cached: {len(result)} records from {source_name}")

        return result

    except Exception as e:
        logger.error(f"Dim Fetch Error: {type(e).__name__}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health", response_model=HealthResponse, summary="健康检查")
async def health_check():
    return HealthResponse(
        status="healthy",
        timestamp=datetime.now().isoformat(),
        cache_enabled=True,
    )


@app.post("/admin/cache/clear", response_model=MessageResponse, summary="清空缓存")
async def clear_cache(api_key: str = Security(get_api_key)):
    """清空所有缓存（管理接口）"""
    multi_cache.clear_all()
    logger.info("Cache cleared by admin request")
    return MessageResponse(status="ok", message="All caches cleared")


@app.get(
    "/admin/datasources/status", response_model=DataSourceStatus, summary="数据源状态"
)
async def get_datasources_status(api_key: str = Security(get_api_key)):
    """获取所有数据源的状态（管理接口）"""
    return data_source_manager.get_source_status()


@app.get(
    "/admin/datasources/health",
    response_model=Dict[str, DataSourceHealthInfo],
    summary="数据源健康检查",
)
async def check_datasources_health(api_key: str = Security(get_api_key)):
    """执行所有数据源的健康检查（管理接口）"""
    return await data_source_manager.health_check_all()


@app.post(
    "/api/v1/batch/prices", response_model=BatchPricesResponse, summary="批量获取价格"
)
async def batch_prices(
    request: BatchPricesRequest,
    api_key: str = Security(get_api_key),
):
    """
    批量获取股票/基金价格

    一次请求获取多个标的的最新价格，减少网络开销。
    适用于用户持仓列表的价格刷新。

    Example:
        POST /api/v1/batch/prices
        Body: {"symbols": ["sh600519", "000001.OF", "AAPL"]}
    """
    prices: List[BatchPriceItem] = []
    errors: List[BatchPriceError] = []

    for symbol in request.symbols:
        try:
            # 1. 先检查 L1 内存缓存
            is_fund = symbol.endswith(".OF") or (len(symbol) == 6 and symbol.isdigit())

            cache_key = (
                f"fund:{symbol.replace('.OF', '')}" if is_fund else f"stock:{symbol}"
            )
            cached_result = multi_cache.get_memory(cache_key)

            if cached_result:
                prices.append(
                    BatchPriceItem(
                        symbol=cached_result["symbol"],
                        price=cached_result["price"],
                        currency=cached_result.get("currency", "CNY"),
                        date=cached_result["date"],
                        source=cached_result.get("source", "Cache"),
                    )
                )
                continue

            # 2. 从数据源获取
            await rate_limiter.wait()

            if is_fund:
                code = symbol.replace(".OF", "")
                fund_data, source = await data_source_manager.fetch_fund_data(code)

                if fund_data:
                    result = {
                        "symbol": f"{code}.OF",
                        "price": fund_data.price,
                        "date": fund_data.date,
                        "source": source,
                        "currency": fund_data.currency,
                    }
                    multi_cache.set_memory(cache_key, result, "fund")
                    prices.append(BatchPriceItem(**result))
                else:
                    errors.append(BatchPriceError(symbol=symbol, error="No data"))
            else:
                prefix = get_stock_prefix_from_symbol(symbol)
                code = symbol[2:] if symbol.startswith(("sh", "sz", "bj")) else symbol

                stock_data, source = await data_source_manager.fetch_stock_data(
                    code, prefix
                )

                if stock_data:
                    result = {
                        "symbol": stock_data.symbol,
                        "price": stock_data.price,
                        "date": stock_data.date,
                        "source": source,
                        "currency": stock_data.currency,
                    }
                    multi_cache.set_memory(cache_key, result, "stock")
                    prices.append(BatchPriceItem(**result))
                else:
                    errors.append(BatchPriceError(symbol=symbol, error="No data"))

        except Exception as e:
            logger.error(f"Batch price fetch failed for {symbol}: {e}")
            errors.append(BatchPriceError(symbol=symbol, error=str(e)))

    logger.info(f"Batch prices: {len(prices)}/{len(request.symbols)} success")

    return BatchPricesResponse(
        success=len(prices),
        failed=len(errors),
        prices=prices,
        errors=errors,
    )


@app.post("/api/v1/batch/warmup", response_model=WarmupResponse, summary="批量预热缓存")
async def batch_warmup(
    symbols: List[str] = Query(..., description="标的代码列表"),
    api_key: str = Security(get_api_key),
):
    """
    批量预热价格缓存

    用于用户持仓标的的预先缓存，减少后续查询延迟。

    Example:
        POST /api/v1/batch/warmup?symbols=sh600519&symbols=sz000001&symbols=000001
    """
    success = 0
    failed = 0
    skipped = 0
    details: List[WarmupDetail] = []

    for symbol in symbols:
        try:
            # 判断是股票还是基金
            is_fund = symbol.endswith(".OF") or (
                len(symbol) == 6 and not symbol.startswith(("sh", "sz", "bj"))
            )

            if is_fund:
                code = symbol.replace(".OF", "")
                await rate_limiter.wait()
                fund_data, source = await data_source_manager.fetch_fund_data(code)

                if fund_data:
                    result = {
                        "symbol": symbol,
                        "price": fund_data.price,
                        "date": fund_data.date,
                        "source": source,
                        "currency": fund_data.currency,
                    }
                    multi_cache.set_memory(f"fund:{code}", result, "fund")
                    multi_cache.set_price_persistent({**result, "symbol": f"{code}.OF"})
                    success += 1
                    details.append(WarmupDetail(symbol=symbol, status="success"))
                else:
                    skipped += 1
                    details.append(
                        WarmupDetail(symbol=symbol, status="skipped", reason="no data")
                    )
            else:
                prefix = get_stock_prefix_from_symbol(symbol)
                code = symbol[2:] if symbol.startswith(("sh", "sz", "bj")) else symbol

                await rate_limiter.wait()
                stock_data, source = await data_source_manager.fetch_stock_data(
                    code, prefix
                )

                if stock_data:
                    result = {
                        "symbol": stock_data.symbol,
                        "price": stock_data.price,
                        "date": stock_data.date,
                        "source": source,
                        "currency": stock_data.currency,
                    }
                    multi_cache.set_memory(f"stock:{symbol}", result, "stock")
                    multi_cache.set_price_persistent(result)
                    success += 1
                    details.append(WarmupDetail(symbol=symbol, status="success"))
                else:
                    skipped += 1
                    details.append(
                        WarmupDetail(symbol=symbol, status="skipped", reason="no data")
                    )

        except Exception as e:
            logger.error(f"Warmup failed for {symbol}: {e}")
            failed += 1
            details.append(WarmupDetail(symbol=symbol, status="failed", error=str(e)))

    logger.info(f"Batch warmup completed: {success}/{len(symbols)} success")

    return WarmupResponse(
        total=len(symbols),
        success=success,
        failed=failed,
        skipped=skipped,
        details=details,
    )


@app.get("/admin/cache/stats", response_model=CacheStats, summary="缓存统计")
async def get_cache_stats(api_key: str = Security(get_api_key)):
    """获取缓存统计信息（管理接口）"""
    return multi_cache.get_stats()


@app.post(
    "/admin/cache/cleanup", response_model=MessageResponse, summary="清理过期缓存"
)
async def cleanup_cache(
    days: int = Query(7, ge=1, le=30, description="清理多少天前的数据"),
    api_key: str = Security(get_api_key),
):
    """清理过期的价格缓存（管理接口）"""
    multi_cache.clear_old_prices(days)
    return MessageResponse(
        status="ok", message=f"Cleaned up price cache older than {days} days"
    )


@app.on_event("startup")
async def startup_event():
    logger.info("Wert Data Sidecar v1.3.0 starting...")
    logger.info("Data sources: Tushare (primary), AkShare (fallback)")
    logger.info("Cache: Memory only (SQLite removed)")
