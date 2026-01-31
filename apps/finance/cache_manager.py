"""
内存缓存管理器

简化版本：只使用内存缓存，移除 SQLite 持久化。
数据持久化由 Wert (PostgreSQL) 负责。

设计目标:
1. 减少对上游 API 的调用频率
2. 提供毫秒级查询响应
3. 支持盘中/盘后不同的缓存策略
"""

import threading
from datetime import datetime, time as dt_time, timedelta
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)


class MultiLayerCache:
    """内存缓存管理器（简化版）"""

    def __init__(self):
        """初始化内存缓存"""
        self._memory_cache: Dict[str, tuple[Any, datetime]] = {}
        self._lock = threading.Lock()
        logger.info("Memory cache initialized (SQLite removed)")

    def _is_trading_hours(self) -> bool:
        """
        判断是否为交易时间

        A股交易时间:
        - 周一至周五
        - 9:30-11:30, 13:00-15:00
        """
        now = datetime.now()

        # 周末不交易
        if now.weekday() >= 5:
            return False

        current_time = now.time()

        # 上午: 9:30-11:30
        morning_start = dt_time(9, 30)
        morning_end = dt_time(11, 30)

        # 下午: 13:00-15:00
        afternoon_start = dt_time(13, 0)
        afternoon_end = dt_time(15, 0)

        return (morning_start <= current_time <= morning_end) or (
            afternoon_start <= current_time <= afternoon_end
        )

    def _get_ttl(self, cache_type: str) -> int:
        """
        根据时间和类型动态计算 TTL

        Args:
            cache_type: 缓存类型 (stock/fund/dim)

        Returns:
            TTL 秒数
        """
        is_trading = self._is_trading_hours()

        if cache_type == "stock":
            # 盘中：2分钟，盘后：30分钟
            return 2 * 60 if is_trading else 30 * 60
        elif cache_type == "fund":
            # 基金一天更新一次，盘后缓存更长
            return 30 * 60 if is_trading else 6 * 60 * 60
        elif cache_type == "dim":
            # 维度数据变化很少
            return 6 * 60 * 60
        else:
            return 5 * 60

    # ========== 内存缓存操作 ==========

    def get_memory(self, key: str) -> Optional[Any]:
        """从内存缓存获取"""
        with self._lock:
            if key in self._memory_cache:
                value, expire_at = self._memory_cache[key]
                if datetime.now() < expire_at:
                    logger.debug(f"Cache hit: {key}")
                    return value
                else:
                    del self._memory_cache[key]
        return None

    def set_memory(self, key: str, value: Any, cache_type: str = "stock"):
        """写入内存缓存"""
        ttl = self._get_ttl(cache_type)
        with self._lock:
            expire_at = datetime.now() + timedelta(seconds=ttl)
            self._memory_cache[key] = (value, expire_at)
            logger.debug(f"Cache set: {key}, TTL: {ttl}s")

    # ========== 兼容性方法（保持 API 不变，但不再持久化）==========

    def get_price_persistent(self, symbol: str) -> Optional[Dict[str, Any]]:
        """
        兼容方法：从内存缓存获取价格
        (SQLite 已移除，直接返回 None)
        """
        return self.get_memory(f"price:{symbol}")

    def set_price_persistent(self, data: Dict[str, Any]):
        """
        兼容方法：写入价格到内存缓存
        (SQLite 已移除，只写内存)
        """
        key = f"price:{data['symbol']}"
        self.set_memory(key, data, "stock")

    def set_dimensions_persistent(self, dimensions: list):
        """
        兼容方法：写入维度数据到内存缓存
        (SQLite 已移除，只写内存)
        """
        self.set_memory("dim:all", dimensions, "dim")
        logger.info(f"Cached {len(dimensions)} dimensions in memory")

    def search_dimensions(self, query: str, limit: int = 10) -> list:
        """
        搜索维度数据（内存版本）

        注意：此方法已弃用，搜索功能移至 Wert PostgreSQL。
        保留此方法仅为兼容性。
        """
        cached_dims = self.get_memory("dim:all")
        if not cached_dims:
            return []

        query_lower = query.lower()
        results = []

        for dim in cached_dims:
            if (
                query_lower in dim.get("symbol", "").lower()
                or query_lower in dim.get("name", "").lower()
                or query_lower in dim.get("pinyin", "").lower()
                or query_lower in dim.get("pinyinAbbr", "").lower()
            ):
                results.append(dim)
                if len(results) >= limit:
                    break

        return results

    # ========== 清理操作 ==========

    def clear_memory(self):
        """清空内存缓存"""
        with self._lock:
            self._memory_cache.clear()
        logger.info("Cache cleared")

    def clear_old_prices(self, days: int = 7):
        """
        兼容方法：清理旧数据
        (内存缓存会自动过期，此方法仅为兼容)
        """
        logger.info("clear_old_prices called (no-op in memory-only mode)")

    def clear_all(self):
        """清空所有缓存"""
        self.clear_memory()
        logger.info("All caches cleared")

    # ========== 统计信息 ==========

    def get_stats(self) -> Dict[str, Any]:
        """获取缓存统计信息"""
        with self._lock:
            cache_size = len(self._memory_cache)

        return {
            "memory_cache_size": cache_size,
            "price_cache_total": 0,  # SQLite 已移除
            "price_cache_today": 0,
            "dimension_cache_total": 0,
            "db_size_mb": 0.0,
        }
