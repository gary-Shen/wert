"""
AkShare 数据源实现

官网: https://akshare.akfamily.xyz/
优势: 免费、无需注册、数据源丰富
劣势: 依赖网页爬虫，稳定性略低
"""

import asyncio
import logging
from typing import Optional, List
import pandas as pd
import akshare as ak

from .base import DataSource, StockData, FundData, DimensionData

logger = logging.getLogger(__name__)


class AkShareDataSource(DataSource):
    """AkShare 数据源"""

    def __init__(self):
        super().__init__(priority=2)  # 次优先级（降级方案）
        logger.info("AkShare data source initialized")

    @property
    def name(self) -> str:
        return "AkShare"

    def _get_stock_prefix(self, code: str) -> str:
        """根据股票代码获取市场前缀"""
        if code.startswith("6"):
            return "sh"
        elif code.startswith(("8", "4")):
            return "bj"
        else:
            return "sz"

    # ========== 同步方法（在线程池中执行） ==========

    def _sync_health_check(self) -> bool:
        """同步健康检查"""
        df = ak.stock_info_a_code_name()
        return df is not None and not df.empty

    def _sync_fetch_stock(self, code: str, prefix: str) -> Optional[StockData]:
        """同步获取股票数据"""
        symbol = f"{prefix}{code}"

        if prefix == "bj":
            df = ak.stock_bj_a_hist_em(symbol=code, period="daily", adjust="hfq")
        else:
            df = ak.stock_zh_a_hist(symbol=code, period="daily", adjust="hfq")

        if df is None or df.empty:
            logger.warning(f"AkShare: No data for {symbol}")
            return None

        last_row = df.iloc[-1]

        return StockData(
            symbol=symbol,
            price=float(last_row["收盘"]),
            date=str(last_row["日期"]),
            currency="CNY"
        )

    def _sync_fetch_fund(self, code: str) -> Optional[FundData]:
        """同步获取基金数据"""
        df = ak.fund_open_fund_info_em(symbol=code, indicator="单位净值走势")

        if df is None or df.empty:
            logger.warning(f"AkShare: No fund data for {code}")
            return None

        # 数据清洗
        df = df[["净值日期", "单位净值"]].copy()
        df.columns = ["date", "price"]
        df["price"] = pd.to_numeric(df["price"], errors="coerce")
        df["date"] = pd.to_datetime(df["date"]).dt.strftime("%Y-%m-%d")
        df = df.dropna()

        last_row = df.iloc[-1]

        return FundData(
            code=code,
            price=float(last_row["price"]),
            date=str(last_row["date"]),
            currency="CNY"
        )

    def _sync_fetch_stock_list(self) -> List[DimensionData]:
        """同步获取股票列表"""
        df = ak.stock_info_a_code_name()

        if df is None or df.empty:
            return []

        return [
            DimensionData(
                symbol=f"{self._get_stock_prefix(row['code'])}{row['code']}",
                name=row["name"],
                asset_type="STOCK"
            )
            for _, row in df.iterrows()
        ]

    def _sync_fetch_fund_list(self) -> List[DimensionData]:
        """同步获取基金列表"""
        df = ak.fund_name_em()

        if df is None or df.empty:
            return []

        return [
            DimensionData(
                symbol=f"{row['基金代码']}.OF",
                name=row["基金简称"],
                asset_type="FUND"
            )
            for _, row in df.iterrows()
        ]

    # ========== 异步方法（包装同步调用到线程池） ==========

    async def health_check(self) -> bool:
        try:
            result = await asyncio.to_thread(self._sync_health_check)
            if result:
                self.record_success()
            return result
        except Exception as e:
            logger.error(f"AkShare health check failed: {e}")
            self.record_failure(str(e))
            return False

    async def fetch_stock_data(self, code: str, prefix: str) -> Optional[StockData]:
        try:
            result = await asyncio.to_thread(self._sync_fetch_stock, code, prefix)
            if result:
                self.record_success()
            return result
        except Exception as e:
            logger.error(f"AkShare stock fetch failed [{code}]: {e}")
            self.record_failure(str(e))
            return None

    async def fetch_fund_data(self, code: str) -> Optional[FundData]:
        try:
            result = await asyncio.to_thread(self._sync_fetch_fund, code)
            if result:
                self.record_success()
            return result
        except Exception as e:
            logger.error(f"AkShare fund fetch failed [{code}]: {e}")
            self.record_failure(str(e))
            return None

    async def fetch_stock_list(self) -> List[DimensionData]:
        try:
            result = await asyncio.to_thread(self._sync_fetch_stock_list)
            self.record_success()
            logger.info(f"AkShare: Fetched {len(result)} stocks")
            return result
        except Exception as e:
            logger.error(f"AkShare stock list fetch failed: {e}")
            self.record_failure(str(e))
            return []

    async def fetch_fund_list(self) -> List[DimensionData]:
        try:
            result = await asyncio.to_thread(self._sync_fetch_fund_list)
            self.record_success()
            logger.info(f"AkShare: Fetched {len(result)} funds")
            return result
        except Exception as e:
            logger.error(f"AkShare fund list fetch failed: {e}")
            self.record_failure(str(e))
            return []
