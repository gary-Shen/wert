"""
数据源基类和数据模型
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional, List
from datetime import datetime
import pandas as pd


@dataclass
class StockData:
    """股票数据"""
    symbol: str
    price: float
    date: str
    currency: str = "CNY"


@dataclass
class FundData:
    """基金数据"""
    code: str
    price: float
    date: str
    currency: str = "CNY"


@dataclass
class DimensionData:
    """维度数据（股票/基金列表）"""
    symbol: str
    name: str
    asset_type: str  # STOCK 或 FUND


@dataclass
class DataSourceHealth:
    """数据源健康状态"""
    available: bool
    last_success: Optional[datetime] = None
    last_failure: Optional[datetime] = None
    consecutive_failures: int = 0
    last_error: Optional[str] = None


class DataSource(ABC):
    """
    数据源抽象基类

    所有数据源（Tushare, AkShare）必须实现此接口
    """

    def __init__(self, priority: int = 99):
        """
        初始化数据源

        Args:
            priority: 优先级（数字越小优先级越高）
        """
        self.priority = priority
        self._health = DataSourceHealth(available=True)

    @property
    @abstractmethod
    def name(self) -> str:
        """数据源名称"""
        pass

    @property
    def health(self) -> DataSourceHealth:
        """获取健康状态"""
        return self._health

    def record_success(self):
        """记录成功调用"""
        self._health.available = True
        self._health.last_success = datetime.now()
        self._health.consecutive_failures = 0
        self._health.last_error = None

    def record_failure(self, error: str):
        """记录失败调用"""
        self._health.last_failure = datetime.now()
        self._health.consecutive_failures += 1
        self._health.last_error = error

        # 连续失败3次后标记为不可用
        if self._health.consecutive_failures >= 3:
            self._health.available = False

    @abstractmethod
    async def health_check(self) -> bool:
        """
        健康检查

        Returns:
            是否健康
        """
        pass

    @abstractmethod
    async def fetch_stock_data(self, code: str, prefix: str) -> Optional[StockData]:
        """
        获取股票数据

        Args:
            code: 股票代码（纯数字）
            prefix: 市场前缀（sh/sz/bj）

        Returns:
            股票数据或 None
        """
        pass

    @abstractmethod
    async def fetch_fund_data(self, code: str) -> Optional[FundData]:
        """
        获取基金数据

        Args:
            code: 基金代码

        Returns:
            基金数据或 None
        """
        pass

    @abstractmethod
    async def fetch_stock_list(self) -> List[DimensionData]:
        """
        获取股票列表

        Returns:
            股票列表
        """
        pass

    @abstractmethod
    async def fetch_fund_list(self) -> List[DimensionData]:
        """
        获取基金列表

        Returns:
            基金列表
        """
        pass
