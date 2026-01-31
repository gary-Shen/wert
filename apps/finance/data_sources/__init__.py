"""
数据源抽象层

提供统一的数据源接口，支持多数据源自动降级。
"""

from .manager import DataSourceManager
from .base import DataSource, StockData, FundData, DimensionData

__all__ = [
    "DataSourceManager",
    "DataSource",
    "StockData",
    "FundData",
    "DimensionData",
]
