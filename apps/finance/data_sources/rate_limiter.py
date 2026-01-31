"""
Tushare API 滑动窗口限流器

根据 Tushare 2000 积分用户的频率限制实现：
- 不同接口有不同的每分钟调用上限
- 使用滑动窗口算法，而非简单的固定间隔
"""

import asyncio
import time
from collections import deque
from typing import Dict, Optional
import logging

logger = logging.getLogger(__name__)


# Tushare 2000 积分用户的接口频率限制（每分钟）
# 参考: https://tushare.pro/document/1?doc_id=290
TUSHARE_RATE_LIMITS: Dict[str, int] = {
    # 行情数据
    "daily": 200,  # 日线行情
    "adj_factor": 200,  # 复权因子
    "daily_basic": 200,  # 每日指标
    # 基金数据
    "fund_nav": 200,  # 基金净值
    "fund_basic": 200,  # 基金列表
    # 基础数据
    "stock_basic": 200,  # 股票列表
    "trade_cal": 500,  # 交易日历
    # 默认限制（未列出的接口）
    "default": 100,
}

# 安全系数：实际使用限制的 80% 以防止边界情况
SAFETY_FACTOR = 0.8


class TushareRateLimiter:
    """
    Tushare API 滑动窗口限流器

    按接口区分频率限制，使用滑动窗口算法追踪每分钟内的请求次数。
    """

    def __init__(self, rate_limits: Optional[Dict[str, int]] = None):
        """
        初始化限流器

        Args:
            rate_limits: 自定义的接口频率限制，如果不提供则使用默认值
        """
        self._limits = rate_limits or TUSHARE_RATE_LIMITS
        # 每个接口的请求时间戳队列
        self._request_times: Dict[str, deque] = {}
        self._lock = asyncio.Lock()

    def _get_limit(self, api_name: str) -> int:
        """获取指定接口的频率限制"""
        base_limit = self._limits.get(api_name, self._limits.get("default", 100))
        return int(base_limit * SAFETY_FACTOR)

    def _get_queue(self, api_name: str) -> deque:
        """获取或创建接口的请求时间队列"""
        if api_name not in self._request_times:
            self._request_times[api_name] = deque()
        return self._request_times[api_name]

    def _clean_old_requests(self, queue: deque, window_seconds: float = 60.0):
        """清理超出时间窗口的旧请求记录"""
        now = time.time()
        while queue and (now - queue[0]) > window_seconds:
            queue.popleft()

    async def wait(self, api_name: str):
        """
        等待直到可以发起请求

        如果当前分钟内的请求数已达上限，则等待到窗口滑动后有空位。

        Args:
            api_name: Tushare API 名称（如 'daily', 'fund_nav'）
        """
        async with self._lock:
            limit = self._get_limit(api_name)
            queue = self._get_queue(api_name)

            while True:
                now = time.time()
                # 清理 60 秒前的请求记录
                self._clean_old_requests(queue)

                if len(queue) < limit:
                    # 有空位，记录请求时间并返回
                    queue.append(now)
                    logger.debug(
                        f"Tushare [{api_name}]: {len(queue)}/{limit} requests in window"
                    )
                    return

                # 没有空位，计算需要等待的时间
                oldest_request = queue[0]
                wait_time = 60.0 - (now - oldest_request) + 0.1  # 额外 0.1 秒缓冲

                if wait_time > 0:
                    logger.info(
                        f"Tushare [{api_name}]: Rate limit reached, waiting {wait_time:.1f}s"
                    )
                    await asyncio.sleep(wait_time)

    def get_stats(self) -> Dict[str, Dict]:
        """获取各接口的当前请求统计"""
        stats = {}
        now = time.time()

        for api_name, queue in self._request_times.items():
            # 只计算最近 60 秒的请求
            recent_count = sum(1 for t in queue if (now - t) <= 60)
            limit = self._get_limit(api_name)
            stats[api_name] = {
                "requests_in_window": recent_count,
                "limit": limit,
                "available": limit - recent_count,
            }

        return stats


# 全局限流器实例
tushare_limiter = TushareRateLimiter()
