"""
Pydantic 模型定义

提供类型安全的请求/响应模型
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Literal


class PriceResponse(BaseModel):
    """价格响应"""

    symbol: str = Field(..., description="标的代码")
    price: float = Field(..., description="价格")
    currency: str = Field(default="CNY", description="货币")
    date: str = Field(..., description="日期")
    source: str = Field(default="Unknown", description="数据源")
    cached: bool = Field(default=False, description="是否来自缓存")
    cache_level: Optional[Literal["L1", "L2", "L3"]] = Field(
        default=None, description="缓存层级"
    )


class DimensionResponse(BaseModel):
    """维度数据响应"""

    symbol: str = Field(..., description="标的代码")
    name: str = Field(..., description="名称")
    pinyin: str = Field(..., description="拼音")
    pinyinAbbr: str = Field(..., description="拼音首字母")
    assetType: Literal["STOCK", "FUND"] = Field(..., description="资产类型")


class SearchResult(BaseModel):
    """搜索结果"""

    query: str = Field(..., description="搜索关键词")
    count: int = Field(..., description="结果数量")
    results: List[DimensionResponse] = Field(..., description="搜索结果")


class WarmupDetail(BaseModel):
    """预热详情"""

    symbol: str
    status: Literal["success", "skipped", "failed"]
    reason: Optional[str] = None
    error: Optional[str] = None


class WarmupResponse(BaseModel):
    """批量预热响应"""

    total: int
    success: int
    failed: int
    skipped: int
    details: List[WarmupDetail]


class CacheStats(BaseModel):
    """缓存统计"""

    memory_cache_size: int = Field(..., description="内存缓存条目数")
    price_cache_total: int = Field(..., description="价格缓存总数")
    price_cache_today: int = Field(..., description="今日价格缓存数")
    dimension_cache_total: int = Field(..., description="维度缓存总数")
    db_size_mb: float = Field(..., description="数据库大小(MB)")


class DataSourceInfo(BaseModel):
    """数据源信息"""

    name: str
    priority: int
    available: bool
    consecutive_failures: int


class DataSourceStatus(BaseModel):
    """数据源状态"""

    total_sources: int
    available_sources: int
    sources: List[DataSourceInfo]


class DataSourceHealthInfo(BaseModel):
    """数据源健康信息"""

    healthy: bool
    available: Optional[bool] = None
    consecutive_failures: Optional[int] = None
    last_success: Optional[str] = None
    last_failure: Optional[str] = None
    last_error: Optional[str] = None
    error: Optional[str] = None


class HealthResponse(BaseModel):
    """健康检查响应"""

    status: Literal["healthy", "unhealthy"]
    timestamp: str
    cache_enabled: bool


class MessageResponse(BaseModel):
    """通用消息响应"""

    status: str
    message: str


class BatchPricesRequest(BaseModel):
    """批量价格请求"""

    symbols: List[str] = Field(
        ..., description="标的代码列表", min_length=1, max_length=50
    )


class BatchPriceItem(BaseModel):
    """单个价格项"""

    symbol: str
    price: float
    currency: str = "CNY"
    date: str
    source: str


class BatchPriceError(BaseModel):
    """价格获取错误"""

    symbol: str
    error: str


class BatchPricesResponse(BaseModel):
    """批量价格响应"""

    success: int = Field(..., description="成功数量")
    failed: int = Field(..., description="失败数量")
    prices: List[BatchPriceItem] = Field(..., description="价格列表")
    errors: List[BatchPriceError] = Field(default=[], description="错误列表")
