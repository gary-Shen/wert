"""
Tushare 数据源实现

官网: https://tushare.pro/
优势: 数据质量高、更新及时、API稳定
限制: 需要token、免费用户有频率限制
"""

import asyncio
import os
import logging
from typing import Optional, List

from .base import DataSource, StockData, FundData, DimensionData
from .rate_limiter import tushare_limiter

logger = logging.getLogger(__name__)


class TushareDataSource(DataSource):
    """Tushare 数据源"""

    def __init__(self, token: Optional[str] = None):
        super().__init__(priority=1)
        self.token = token or os.getenv("TUSHARE_TOKEN")

        if not self.token:
            logger.warning("TUSHARE_TOKEN not configured, Tushare source disabled")
            self._health.available = False
            self._pro = None
        else:
            try:
                import tushare as ts

                self._pro = ts.pro_api(self.token)
                logger.info("Tushare data source initialized")
            except Exception as e:
                logger.error(f"Failed to initialize Tushare: {e}")
                self._health.available = False
                self._pro = None

    @property
    def name(self) -> str:
        return "Tushare"

    def _ts_code(self, code: str, prefix: str) -> str:
        """转换为 Tushare 格式: 600519 + sh -> 600519.SH"""
        market_map = {"sh": "SH", "sz": "SZ", "bj": "BJ"}
        return f"{code}.{market_map.get(prefix, 'SH')}"

    # ========== 同步方法（在线程池中执行） ==========

    def _sync_health_check(self) -> bool:
        """同步健康检查"""
        if not self._pro:
            return False
        self._pro.trade_cal(limit=1)
        return True

    def _sync_fetch_stock(self, code: str, prefix: str) -> Optional[StockData]:
        """同步获取股票数据"""
        if not self._pro:
            return None

        ts_code = self._ts_code(code, prefix)
        symbol = f"{prefix}{code}"

        df = self._pro.daily(ts_code=ts_code)

        if df is None or df.empty:
            logger.warning(f"Tushare: No data for {ts_code}")
            return None

        df = df.sort_values("trade_date", ascending=False)
        last_row = df.iloc[0]

        date_str = str(last_row["trade_date"])
        formatted_date = f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:]}"

        return StockData(
            symbol=symbol,
            price=float(last_row["close"]),
            date=formatted_date,
            currency="CNY",
        )

    def _sync_fetch_fund(self, code: str) -> Optional[FundData]:
        """同步获取基金数据"""
        if not self._pro:
            return None

        ts_code = f"{code}.OF"
        df = self._pro.fund_nav(ts_code=ts_code)

        if df is None or df.empty:
            logger.warning(f"Tushare: No fund data for {ts_code}")
            return None

        df = df.sort_values("end_date", ascending=False)
        last_row = df.iloc[0]

        date_str = str(last_row["end_date"])
        formatted_date = f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:]}"

        return FundData(
            code=code,
            price=float(last_row["unit_nav"]),
            date=formatted_date,
            currency="CNY",
        )

    def _sync_fetch_stock_list(self) -> List[DimensionData]:
        """同步获取股票列表"""
        if not self._pro:
            return []

        df = self._pro.stock_basic(list_status="L", fields="ts_code,symbol,name")

        if df is None or df.empty:
            return []

        result = []
        for _, row in df.iterrows():
            code = row["symbol"]
            market = row["ts_code"].split(".")[1].lower()
            symbol = f"{market}{code}"
            result.append(
                DimensionData(symbol=symbol, name=row["name"], asset_type="STOCK")
            )

        return result

    def _sync_fetch_fund_list(self) -> List[DimensionData]:
        """同步获取基金列表"""
        if not self._pro:
            return []

        df = self._pro.fund_basic(market="E", status="D", fields="ts_code,name")

        if df is None or df.empty:
            return []

        return [
            DimensionData(symbol=row["ts_code"], name=row["name"], asset_type="FUND")
            for _, row in df.iterrows()
        ]

    # ========== 异步方法（包装同步调用到线程池） ==========

    async def health_check(self) -> bool:
        if not self._pro:
            return False
        try:
            result = await asyncio.to_thread(self._sync_health_check)
            self.record_success()
            return result
        except Exception as e:
            logger.error(f"Tushare health check failed: {e}")
            self.record_failure(str(e))
            return False

    async def fetch_stock_data(self, code: str, prefix: str) -> Optional[StockData]:
        try:
            await tushare_limiter.wait("daily")
            result = await asyncio.to_thread(self._sync_fetch_stock, code, prefix)
            if result:
                self.record_success()
            return result
        except Exception as e:
            logger.error(f"Tushare stock fetch failed [{code}]: {e}")
            self.record_failure(str(e))
            return None

    async def fetch_fund_data(self, code: str) -> Optional[FundData]:
        try:
            await tushare_limiter.wait("fund_nav")
            result = await asyncio.to_thread(self._sync_fetch_fund, code)
            if result:
                self.record_success()
            return result
        except Exception as e:
            logger.error(f"Tushare fund fetch failed [{code}]: {e}")
            self.record_failure(str(e))
            return None

    async def fetch_stock_list(self) -> List[DimensionData]:
        try:
            await tushare_limiter.wait("stock_basic")
            result = await asyncio.to_thread(self._sync_fetch_stock_list)
            self.record_success()
            logger.info(f"Tushare: Fetched {len(result)} stocks")
            return result
        except Exception as e:
            logger.error(f"Tushare stock list fetch failed: {e}")
            self.record_failure(str(e))
            return []

    async def fetch_fund_list(self) -> List[DimensionData]:
        try:
            await tushare_limiter.wait("fund_basic")
            result = await asyncio.to_thread(self._sync_fetch_fund_list)
            self.record_success()
            logger.info(f"Tushare: Fetched {len(result)} funds")
            return result
        except Exception as e:
            logger.error(f"Tushare fund list fetch failed: {e}")
            self.record_failure(str(e))
            return []
