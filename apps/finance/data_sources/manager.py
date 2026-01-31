"""
数据源管理器

负责管理多个数据源，实现自动降级策略。
"""

import logging
from typing import Optional, List

from .base import DataSource, StockData, FundData, DimensionData
from .tushare_source import TushareDataSource
from .akshare_source import AkShareDataSource

logger = logging.getLogger(__name__)


class DataSourceManager:
    """
    数据源管理器

    特性:
    1. 多数据源支持（Tushare优先，AkShare降级）
    2. 自动健康检查和故障切换
    3. 统一的错误处理和重试逻辑
    """

    def __init__(self):
        """初始化数据源管理器"""
        self.sources: List[DataSource] = []
        self._initialize_sources()

    def _initialize_sources(self):
        """初始化所有数据源"""
        # 按优先级顺序添加数据源
        tushare = TushareDataSource()
        akshare = AkShareDataSource()

        self.sources = [tushare, akshare]

        # 按优先级排序
        self.sources.sort(key=lambda s: s.priority)

        logger.info(f"Data sources initialized: {[s.name for s in self.sources]}")

    def _get_available_sources(self) -> List[DataSource]:
        """获取可用的数据源列表"""
        return [s for s in self.sources if s.health.available]

    async def _fetch_with_fallback(self, fetch_func_name: str, *args, **kwargs):
        """
        使用降级策略获取数据

        Args:
            fetch_func_name: 数据源方法名
            *args, **kwargs: 传递给方法的参数

        Returns:
            数据或 None
        """
        available_sources = self._get_available_sources()

        if not available_sources:
            logger.error("No available data sources")
            # 尝试重置所有数据源状态
            for source in self.sources:
                source._health.available = True
                source._health.consecutive_failures = 0
            available_sources = self.sources

        last_error = None

        for source in available_sources:
            try:
                logger.debug(f"Trying {source.name} for {fetch_func_name}")

                # 调用数据源方法
                fetch_func = getattr(source, fetch_func_name)
                result = await fetch_func(*args, **kwargs)

                if result is not None:
                    logger.info(f"Data fetched from {source.name}")
                    return result, source.name

                logger.warning(f"{source.name} returned None for {fetch_func_name}")

            except Exception as e:
                last_error = e
                logger.warning(
                    f"{source.name} failed for {fetch_func_name}: {e}, "
                    f"trying next source..."
                )
                continue

        # 所有数据源都失败
        logger.error(f"All data sources failed for {fetch_func_name}")
        if last_error:
            raise last_error

        return None, "Unknown"

    async def fetch_stock_data(
        self, code: str, prefix: str
    ) -> Optional[tuple[StockData, str]]:
        """
        获取股票数据

        Args:
            code: 股票代码
            prefix: 市场前缀

        Returns:
            (StockData, 数据源名称) 或 (None, "Unknown")
        """
        return await self._fetch_with_fallback("fetch_stock_data", code, prefix)

    async def fetch_fund_data(self, code: str) -> Optional[tuple[FundData, str]]:
        """
        获取基金数据

        Args:
            code: 基金代码

        Returns:
            (FundData, 数据源名称) 或 (None, "Unknown")
        """
        return await self._fetch_with_fallback("fetch_fund_data", code)

    async def fetch_dimensions(self) -> tuple[List[DimensionData], str]:
        """
        获取维度数据（股票+基金列表）

        Returns:
            (维度数据列表, 数据源名称)
        """
        available_sources = self._get_available_sources()

        if not available_sources:
            logger.error("No available data sources for dimensions")
            available_sources = self.sources

        for source in available_sources:
            try:
                logger.info(f"Fetching dimensions from {source.name}")

                # 获取股票和基金列表
                stocks = await source.fetch_stock_list()
                funds = await source.fetch_fund_list()

                # 合并
                all_dimensions = stocks + funds

                if all_dimensions:
                    logger.info(
                        f"Fetched {len(all_dimensions)} dimensions from {source.name} "
                        f"(stocks: {len(stocks)}, funds: {len(funds)})"
                    )
                    return all_dimensions, source.name

                logger.warning(f"{source.name} returned empty dimensions")

            except Exception as e:
                logger.warning(f"{source.name} failed to fetch dimensions: {e}")
                continue

        logger.error("All data sources failed to fetch dimensions")
        return [], "Unknown"

    async def health_check_all(self) -> dict:
        """
        检查所有数据源的健康状态

        Returns:
            数据源健康状态字典
        """
        results = {}

        for source in self.sources:
            try:
                is_healthy = await source.health_check()
                results[source.name] = {
                    "healthy": is_healthy,
                    "available": source.health.available,
                    "consecutive_failures": source.health.consecutive_failures,
                    "last_success": (
                        source.health.last_success.isoformat()
                        if source.health.last_success
                        else None
                    ),
                    "last_failure": (
                        source.health.last_failure.isoformat()
                        if source.health.last_failure
                        else None
                    ),
                    "last_error": source.health.last_error,
                }
            except Exception as e:
                results[source.name] = {
                    "healthy": False,
                    "error": str(e),
                }

        return results

    def get_source_status(self) -> dict:
        """
        获取数据源状态摘要

        Returns:
            状态摘要
        """
        return {
            "total_sources": len(self.sources),
            "available_sources": len(self._get_available_sources()),
            "sources": [
                {
                    "name": s.name,
                    "priority": s.priority,
                    "available": s.health.available,
                    "consecutive_failures": s.health.consecutive_failures,
                }
                for s in self.sources
            ],
        }
