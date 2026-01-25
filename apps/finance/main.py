import akshare as ak
import pandas as pd
from fastapi import FastAPI, HTTPException, Query, Security, status
from fastapi.security import APIKeyHeader
from pydantic import BaseModel
import logging
from datetime import datetime, timedelta
import os
from typing import List, Optional, Dict, Any
from functools import wraps
import time
import threading

from pypinyin import lazy_pinyin, Style

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# port 8001
app = FastAPI(title="Wert Data Sidecar", version="1.1.0")


# ============ 缓存配置 ============
class SimpleCache:
    """简单的内存缓存，支持 TTL"""

    def __init__(self):
        self._cache: Dict[str, tuple[Any, datetime]] = {}
        self._lock = threading.Lock()

    def get(self, key: str) -> Optional[Any]:
        with self._lock:
            if key in self._cache:
                value, expire_at = self._cache[key]
                if datetime.now() < expire_at:
                    logger.debug(f"Cache hit: {key}")
                    return value
                else:
                    del self._cache[key]
            return None

    def set(self, key: str, value: Any, ttl_seconds: int = 300):
        with self._lock:
            expire_at = datetime.now() + timedelta(seconds=ttl_seconds)
            self._cache[key] = (value, expire_at)
            logger.debug(f"Cache set: {key}, TTL: {ttl_seconds}s")

    def clear(self):
        with self._lock:
            self._cache.clear()


# 全局缓存实例
cache = SimpleCache()

# 缓存 TTL 配置 (秒)
CACHE_TTL_STOCK = 60 * 5      # 股票价格缓存 5 分钟
CACHE_TTL_FUND = 60 * 30      # 基金净值缓存 30 分钟 (基金净值一天只更新一次)
CACHE_TTL_DIM = 60 * 60 * 6   # 维度数据缓存 6 小时


# ============ 重试装饰器 ============
def retry_with_backoff(retries: int = 3, backoff_in_seconds: float = 1.0, exceptions: tuple = (Exception,)):
    """
    带指数退避的重试装饰器

    Args:
        retries: 最大重试次数
        backoff_in_seconds: 初始退避时间
        exceptions: 需要重试的异常类型
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            last_exception = None
            for attempt in range(retries + 1):
                try:
                    return func(*args, **kwargs)
                except exceptions as e:
                    last_exception = e
                    if attempt < retries:
                        sleep_time = backoff_in_seconds * (2 ** attempt)
                        logger.warning(
                            f"Attempt {attempt + 1}/{retries + 1} failed for {func.__name__}: {str(e)}. "
                            f"Retrying in {sleep_time:.1f}s..."
                        )
                        time.sleep(sleep_time)
                    else:
                        logger.error(f"All {retries + 1} attempts failed for {func.__name__}: {str(e)}")
            raise last_exception
        return wrapper
    return decorator


# ============ 请求限流 ============
class RateLimiter:
    """简单的请求限流器"""

    def __init__(self, min_interval: float = 0.5):
        self._last_request_time = 0.0
        self._min_interval = min_interval
        self._lock = threading.Lock()

    def wait(self):
        with self._lock:
            now = time.time()
            elapsed = now - self._last_request_time
            if elapsed < self._min_interval:
                sleep_time = self._min_interval - elapsed
                time.sleep(sleep_time)
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


# ============ 响应模型 ============
class PriceResponse(BaseModel):
    symbol: str
    price: float
    currency: str = "CNY"
    date: str
    source: str = "AkShare"
    cached: bool = False


class SpotResponse(BaseModel):
    symbol: str
    name: str
    pinyin: str
    pinyinAbbr: str
    assetType: str


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


@retry_with_backoff(retries=3, backoff_in_seconds=1.0)
def fetch_stock_data(code: str, prefix: str) -> pd.DataFrame:
    """获取股票历史数据（带重试）"""
    rate_limiter.wait()

    if prefix == "bj":
        return ak.stock_bj_a_hist_em(symbol=code, period="daily", adjust="hfq")
    else:
        return ak.stock_zh_a_hist(symbol=code, period="daily", adjust="hfq")


@retry_with_backoff(retries=3, backoff_in_seconds=1.0)
def fetch_fund_data(code: str) -> pd.DataFrame:
    """获取基金净值数据（带重试）"""
    rate_limiter.wait()
    return ak.fund_open_fund_info_em(symbol=code, indicator="单位净值走势")


@retry_with_backoff(retries=3, backoff_in_seconds=1.0)
def fetch_stock_list() -> pd.DataFrame:
    """获取 A 股列表（带重试）"""
    rate_limiter.wait()
    return ak.stock_info_a_code_name()


@retry_with_backoff(retries=3, backoff_in_seconds=1.0)
def fetch_fund_list() -> pd.DataFrame:
    """获取基金列表（带重试）"""
    rate_limiter.wait()
    return ak.fund_name_em()


# ============ API 路由 ============
@app.get(
    "/api/v1/stock/eod",
    response_model=PriceResponse,
    summary="获取股票收盘价",
    description="根据股票代码获取 A 股股票最新的当日收盘价（后复权）。支持上交所(sh)、深交所(sz)、北交所(bj)。",
)
async def get_stock_eod(
    symbol: str = Query(..., description="股票代码，例如 sz000001、sh600519 或 bj830799"),
    api_key: str = Security(get_api_key),
):
    # 1. 检查缓存
    cache_key = f"stock:{symbol}"
    cached_result = cache.get(cache_key)
    if cached_result:
        return {**cached_result, "cached": True}

    # 2. 从 AkShare 获取数据
    try:
        prefix = get_stock_prefix_from_symbol(symbol)
        code = symbol[2:] if symbol.startswith(("sh", "sz", "bj")) else symbol

        df = fetch_stock_data(code, prefix)

        if df is None or df.empty:
            raise HTTPException(status_code=404, detail="未找到该股票行情数据")

        last_row = df.iloc[-1]
        result = {
            "symbol": symbol,
            "price": float(last_row["收盘"]),
            "date": str(last_row["日期"]),
            "source": "AkShare",
            "currency": "CNY",
        }

        # 3. 写入缓存
        cache.set(cache_key, result, CACHE_TTL_STOCK)

        return {**result, "cached": False}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Stock Fetch Error [{symbol}]: {type(e).__name__}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"获取股票数据失败: {type(e).__name__}"
        )


@app.get(
    "/api/v1/fund/nav",
    response_model=PriceResponse,
    summary="获取基金净值",
    description="根据基金代码获取公募基金最新的单位净值。",
)
async def get_fund_nav(
    code: str = Query(..., description="基金代码，例如 000001"),
    fund_type: str = Query("open", description="基金类型: open, qdii, etf"),
    api_key: str = Security(get_api_key),
):
    # 1. 检查缓存
    cache_key = f"fund:{code}"
    cached_result = cache.get(cache_key)
    if cached_result:
        return {**cached_result, "cached": True}

    # 2. 从 AkShare 获取数据
    try:
        df = fetch_fund_data(code)

        if df is None or df.empty:
            raise HTTPException(status_code=404, detail="基金代码错误或无数据")

        # 数据清洗
        df = df[["净值日期", "单位净值"]].copy()
        df.columns = ["date", "price"]
        df["price"] = pd.to_numeric(df["price"], errors="coerce")
        df["date"] = pd.to_datetime(df["date"]).dt.strftime("%Y-%m-%d")
        df = df.dropna()

        last_row = df.iloc[-1]
        result = {
            "symbol": code,
            "price": float(last_row["price"]),
            "date": str(last_row["date"]),
            "source": "EastMoney",
            "currency": "CNY",
        }

        # 3. 写入缓存
        cache.set(cache_key, result, CACHE_TTL_FUND)

        return {**result, "cached": False}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Fund Fetch Error [{code}]: {type(e).__name__}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"获取基金数据失败: {type(e).__name__}"
        )


@app.get("/api/v1/dim", response_model=List[SpotResponse])
async def get_dimensions(api_key: str = Security(get_api_key)):
    """获取全量 A 股和公募基金的维度信息"""

    # 1. 检查缓存
    cache_key = "dim:all"
    cached_result = cache.get(cache_key)
    if cached_result:
        logger.info("Returning cached dimension data")
        return cached_result

    # 2. 获取数据
    try:
        # 获取股票列表
        df_stocks = fetch_stock_list()
        df_stocks = df_stocks[["code", "name"]].rename(columns={"code": "symbol"})
        df_stocks["symbol"] = df_stocks["symbol"].apply(
            lambda x: f"{get_stock_prefix(x)}{x}"
        )
        df_stocks["assetType"] = "STOCK"

        # 获取基金列表
        df_funds = fetch_fund_list()
        df_funds = df_funds[["基金代码", "基金简称"]].rename(
            columns={"基金代码": "symbol", "基金简称": "name"}
        )
        df_funds["symbol"] = df_funds["symbol"].apply(lambda x: f"{x}.OF")
        df_funds["assetType"] = "FUND"

        # 合并
        df_all = pd.concat([df_stocks, df_funds], ignore_index=True)

        # 生成拼音
        df_all["pinyin"] = df_all["name"].apply(lambda x: "".join(lazy_pinyin(x)))
        df_all["pinyinAbbr"] = df_all["name"].apply(
            lambda x: "".join(lazy_pinyin(x, style=Style.FIRST_LETTER))
        )

        result = df_all.to_dict(orient="records")

        # 3. 写入缓存
        cache.set(cache_key, result, CACHE_TTL_DIM)
        logger.info(f"Dimension data cached: {len(result)} records")

        return result

    except Exception as e:
        logger.error(f"Dim Fetch Error: {type(e).__name__}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health", summary="健康检查")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "cache_enabled": True,
    }


@app.post("/admin/cache/clear", summary="清空缓存")
async def clear_cache(api_key: str = Security(get_api_key)):
    """清空所有缓存（管理接口）"""
    cache.clear()
    logger.info("Cache cleared by admin request")
    return {"status": "ok", "message": "Cache cleared"}


# ============ 启动事件 ============
@app.on_event("startup")
async def startup_event():
    logger.info("Wert Data Sidecar starting...")
    logger.info(f"Cache TTL - Stock: {CACHE_TTL_STOCK}s, Fund: {CACHE_TTL_FUND}s, Dim: {CACHE_TTL_DIM}s")
