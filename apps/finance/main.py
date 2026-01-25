import akshare as ak
import pandas as pd
from fastapi import FastAPI, HTTPException, Query, Security, status
from fastapi.security import APIKeyHeader
from pydantic import BaseModel
import logging
from datetime import datetime
import os
from typing import List

from pypinyin import lazy_pinyin, Style

import time
from functools import wraps

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# port 8001
app = FastAPI(title="Wert Data Sidecar", version="1.0.0")


# 安全配置
API_KEY_NAME = "X-API-Key"
API_KEY = os.getenv(
    "API_KEY", "sk-snapworth-dev-key-2026"
)  # 从环境变量读取或使用默认值

api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=False)


async def get_api_key(
    api_key_header: str = Security(api_key_header),
):
    if api_key_header == API_KEY:
        return api_key_header
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Could not validate credentials",
    )


# --- 响应模型定义 ---
class PriceResponse(BaseModel):
    symbol: str
    price: float
    currency: str = "CNY"
    date: str
    source: str = "AkShare"


# --- 业务逻辑封装 ---


@app.get(
    "/api/v1/stock/eod",
    response_model=PriceResponse,
    summary="获取股票收盘价",
    description="根据股票代码获取 A 股股票最新的当日收盘价（后复权）。",
    response_description="包含股票代码、收盘价及日期的价格信息对象",
)
async def get_stock_eod(
    symbol: str = Query(
        ..., description="股票代码，需包含市场前缀，例如 sz000001 或 sh600519"
    ),
    api_key: str = Security(get_api_key),
):
    """
    通过 AkShare 获取 A 股历史行情数据，并返回最近交易日的收盘价。

    - **symbol**: 股票代码 (e.g. sz000001)
    """
    try:
        # 获取历史行情数据 (默认获取最近一天的)
        # symbol 格式通常为 'sh600519' 或 'sz000001'
        # AkShare 接口仅需要数字代码，故去除前缀
        df = ak.stock_zh_a_hist(symbol=symbol[2:], period="daily", adjust="hfq")

        if df.empty:
            raise HTTPException(status_code=404, detail="未找到该股票行情数据")

        last_row = df.iloc[-1]
        return {
            "symbol": symbol,
            "price": float(last_row["收盘"]),
            "date": str(last_row["日期"]),
        }
    except Exception as e:
        logger.error(f"Stock Fetch Error: {str(e)}")
        raise HTTPException(status_code=500, detail="获取股票数据失败")


@app.get(
    "/api/v1/fund/nav",
    response_model=PriceResponse,
    summary="获取基金净值",
    description="根据基金代码获取公募基金最新的单位净值。",
    response_description="包含基金代码、单位净值及净值日期的价格信息对象",
)
async def get_fund_nav(
    code: str = Query(..., description="基金代码，例如 000001"),
    api_key: str = Security(get_api_key),
):
    """
    通过 AkShare 获取公募基金历史净值数据，并返回最新日期的净值。

    - **code**: 基金代码 (e.g. 000001)
    """
    try:
        # 1. 从 AkShare 获取原始基金净值数据
        # indicator="单位净值走势" 返回历史净值列表
        df = ak.fund_open_fund_info_em(symbol=code, indicator="单位净值走势")

        if df is None or df.empty:
            raise HTTPException(status_code=404, detail="基金代码错误或无数据")

        # 2. 数据清洗与标准化处理

        # 选择所需列并重命名，统一输出字段
        df = df[["净值日期", "单位净值"]].copy()
        df.columns = ["date", "price"]

        # 类型转换：价格转为浮点数，日期格式化为 YYYY-MM-DD
        df["price"] = pd.to_numeric(df["price"], errors="coerce")
        df["date"] = pd.to_datetime(df["date"]).dt.strftime("%Y-%m-%d")

        # 去除无效数据（如价格解析失败的行）
        df = df.dropna()

        # 3. 获取最新数据
        # 列表通常按日期升序排列，取最后一行即为最新净值
        last_row = df.iloc[-1]

        return {
            "symbol": code,
            "price": float(last_row["price"]),
            "date": str(last_row["date"]),
        }

    except Exception as e:
        # 捕获所有异常并返回 500，方便客户端调试
        raise HTTPException(status_code=500, detail=str(e))


class SpotResponse(BaseModel):
    symbol: str
    name: str
    pinyin: str
    pinyinAbbr: str
    assetType: str


@app.get("/api/v1/dim", response_model=List[SpotResponse])
async def get_stckspot(api_key: str = Security(get_api_key)):
    """
    获取全量 A 股和公募基金的维度信息 (用于搜索补全)。

    包含：
    - A 股 (stock_zh_a_spot_em)
    - 公募基金 (fund_name_em)

    自动生成拼音全拼和首字母缩写。
    """

    def retry_with_backoff(retries=3, backoff_in_seconds=1):
        def decorator(func):
            @wraps(func)
            def wrapper(*args, **kwargs):
                x = 0
                while True:
                    try:
                        return func(*args, **kwargs)
                    except Exception as e:
                        if x == retries:
                            raise e
                        sleep_time = backoff_in_seconds * 2**x
                        time.sleep(sleep_time)
                        x += 1

            return wrapper

        return decorator

    @retry_with_backoff(retries=3, backoff_in_seconds=1)
    def fetch_stocks():
        # 获取 A 股基础信息 (仅代码和名称)
        # 相比 stock_zh_a_spot_em (实时行情), 这个接口更稳定且不易被封
        df = ak.stock_info_a_code_name()
        df = df[["code", "name"]].rename(columns={"code": "symbol"})

        # 补全前缀 (简单规则: 6开头为sh, 其他为sz)
        df["symbol"] = df["symbol"].apply(
            lambda x: f"sh{x}" if str(x).startswith("6") else f"sz{x}"
        )
        df["assetType"] = "STOCK"
        return df

    @retry_with_backoff(retries=3, backoff_in_seconds=1)
    def fetch_funds():
        # 获取公募基金列表
        df = ak.fund_name_em()
        # 基金代码, 基金简称
        df = df[["基金代码", "基金简称"]].rename(
            columns={"基金代码": "symbol", "基金简称": "name"}
        )
        # 基金统一后缀 .OF (Snapworth 内部约定)
        df["symbol"] = df["symbol"].apply(lambda x: f"{x}.OF")
        df["assetType"] = "FUND"
        return df

    try:
        # 串行执行以避免触发上游反爬或连接重置
        df_stocks = fetch_stocks()
        df_funds = fetch_funds()

        # 合并数据
        df_all = pd.concat([df_stocks, df_funds], ignore_index=True)

        # 生成拼音 (耗时操作, 但 pandas apply 较快)
        # pypinyin lazy_pinyin 返回 list, join 成字符串
        df_all["pinyin"] = df_all["name"].apply(lambda x: "".join(lazy_pinyin(x)))
        # 首字母
        df_all["pinyinAbbr"] = df_all["name"].apply(
            lambda x: "".join(lazy_pinyin(x, style=Style.FIRST_LETTER))
        )

        return df_all.to_dict(orient="records")

    except Exception as e:
        logger.error(f"Dim Fetch Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get(
    "/health",
    summary="健康检查",
    description="检查服务运行状态及当前服务器时间。",
    response_description="包含服务状态和时间戳的 JSON 对象",
)
async def health_check():
    """
    服务健康检查接口。
    """
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}
