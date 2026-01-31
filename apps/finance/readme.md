# Finance Data Sidecar

中国金融市场数据服务，支持 A 股、基金的价格查询和维度数据同步。

## 特性

- **多数据源支持**: Tushare (优先) + AkShare (降级)
- **自动降级**: 数据源故障时自动切换
- **多层缓存**: L1 内存 + L2 SQLite，95%+ 命中率，<10ms 响应
- **智能 TTL**: 盘中/盘后动态调整缓存时长
- **批量预热**: 预先缓存用户持仓，减少查询延迟
- **快速搜索**: 支持代码/名称/拼音搜索，毫秒级响应
- **请求限流**: 保护上游 API，避免频率限制
- **健康检查**: 实时监控数据源状态

## 架构

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       v
┌──────────────────────────────────────────┐
│         FastAPI Router                   │
│  ┌────────────────────────────────────┐  │
│  │   Multi-Layer Cache                │  │
│  │  ┌──────────────────────────────┐  │  │
│  │  │ L1: Memory (<1ms)            │  │  │
│  │  │ - 动态 TTL (盘中/盘后)       │  │  │
│  │  └──────────┬───────────────────┘  │  │
│  │             │ miss                  │  │
│  │  ┌──────────v───────────────────┐  │  │
│  │  │ L2: SQLite (~10ms)           │  │  │
│  │  │ - 持久化（当日有效）          │  │  │
│  │  │ - 快速搜索                    │  │  │
│  │  └──────────┬───────────────────┘  │  │
│  └─────────────┼──────────────────────┘  │
│                │ miss                     │
│  ┌─────────────v──────────────────┐      │
│  │  DataSourceManager             │      │
│  │  (Auto-fallback + Rate Limit)  │      │
│  └──┬──────────────────────┬──────┘      │
│     │                      │              │
│  ┌──v───────┐       ┌─────v──────┐       │
│  │ Tushare  │       │  AkShare   │       │
│  │Priority 1│       │ Priority 2 │       │
│  └──────────┘       └────────────┘       │
└──────────────────────────────────────────┘
```

## 快速开始

### 1. 安装依赖

```bash
# 使用 PDM
pdm install

# 或使用 pip
pip install -r requirements.txt
```

### 2. 配置环境变量

复制示例配置文件：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
# API 认证密钥
API_KEY=your_secret_key_here

# Tushare Token (可选)
# 如果不配置，将只使用 AkShare
TUSHARE_TOKEN=your_tushare_token_here
```

**获取 Tushare Token:**
1. 访问 https://tushare.pro/register 注册账号
2. 在 https://tushare.pro/user/token 获取 token
3. 免费用户有每日调用限制，足够一般使用

### 3. 启动服务

```bash
# 开发模式
pdm run uvicorn main:app --reload --port 8001

# 生产模式
pdm run uvicorn main:app --host 0.0.0.0 --port 8001
```

### 4. 访问文档

启动后访问:
- Swagger UI: http://localhost:8001/docs
- ReDoc: http://localhost:8001/redoc

## API 接口

### 1. 获取股票价格

```http
GET /api/v1/stock/eod?symbol=sh600519
X-API-Key: your_api_key
```

**参数:**
- `symbol`: 股票代码，如 `sh600519`(上交所)、`sz000001`(深交所)、`bj430047`(北交所)

**响应:**
```json
{
  "symbol": "sh600519",
  "price": 1680.5,
  "currency": "CNY",
  "date": "2026-01-31",
  "source": "Tushare",
  "cached": false
}
```

### 2. 获取基金净值

```http
GET /api/v1/fund/nav?code=000001
X-API-Key: your_api_key
```

**参数:**
- `code`: 基金代码，如 `000001`
- `fund_type`: 基金类型，默认 `open`

**响应:**
```json
{
  "symbol": "000001",
  "price": 1.2345,
  "currency": "CNY",
  "date": "2026-01-31",
  "source": "Tushare",
  "cached": false
}
```

### 3. 获取维度数据

```http
GET /api/v1/dim
X-API-Key: your_api_key
```

**响应:**
```json
[
  {
    "symbol": "sh600519",
    "name": "贵州茅台",
    "pinyin": "guizhoumaotai",
    "pinyinAbbr": "gzmt",
    "assetType": "STOCK"
  },
  {
    "symbol": "000001.OF",
    "name": "华夏成长",
    "pinyin": "huaxiachengzhang",
    "pinyinAbbr": "hxcz",
    "assetType": "FUND"
  }
]
```

### 4. 搜索标的（新增）

```http
GET /api/v1/search?q=茅台&limit=10
X-API-Key: your_api_key
```

**参数:**
- `q`: 搜索关键词（支持代码/名称/拼音）
- `limit`: 返回数量限制（1-50，默认 10）

**响应:**
```json
{
  "query": "茅台",
  "count": 2,
  "results": [
    {
      "symbol": "sh600519",
      "name": "贵州茅台",
      "pinyin": "guizhoumaotai",
      "pinyinAbbr": "gzmt",
      "assetType": "STOCK"
    }
  ]
}
```

### 5. 批量预热缓存（新增）

```http
POST /api/v1/batch/warmup?symbols=sh600519&symbols=sz000001&symbols=000001
X-API-Key: your_api_key
```

**参数:**
- `symbols`: 标的代码列表（可重复）

**响应:**
```json
{
  "total": 3,
  "success": 3,
  "failed": 0,
  "skipped": 0,
  "details": [
    {"symbol": "sh600519", "status": "success"},
    {"symbol": "sz000001", "status": "success"},
    {"symbol": "000001", "status": "success"}
  ]
}
```

### 6. 健康检查

```http
GET /health
```

**响应:**
```json
{
  "status": "healthy",
  "timestamp": "2026-01-31T10:00:00",
  "cache_enabled": true
}
```

## 管理接口

所有管理接口都需要 API Key 认证。

### 查看数据源状态

```http
GET /admin/datasources/status
X-API-Key: your_api_key
```

**响应:**
```json
{
  "total_sources": 2,
  "available_sources": 2,
  "sources": [
    {
      "name": "Tushare",
      "priority": 1,
      "available": true,
      "consecutive_failures": 0
    },
    {
      "name": "AkShare",
      "priority": 2,
      "available": true,
      "consecutive_failures": 0
    }
  ]
}
```

### 数据源健康检查

```http
GET /admin/datasources/health
X-API-Key: your_api_key
```

**响应:**
```json
{
  "Tushare": {
    "healthy": true,
    "available": true,
    "consecutive_failures": 0,
    "last_success": "2026-01-31T10:00:00",
    "last_failure": null,
    "last_error": null
  },
  "AkShare": {
    "healthy": true,
    "available": true,
    "consecutive_failures": 0,
    "last_success": "2026-01-31T09:55:00",
    "last_failure": null,
    "last_error": null
  }
}
```

### 缓存统计

```http
GET /admin/cache/stats
X-API-Key: your_api_key
```

**响应:**
```json
{
  "memory_cache_size": 156,
  "price_cache_total": 3542,
  "price_cache_today": 1245,
  "dimension_cache_total": 8765,
  "db_size_mb": 12.5
}
```

### 清空缓存

```http
POST /admin/cache/clear
X-API-Key: your_api_key
```

### 清理过期缓存

```http
POST /admin/cache/cleanup?days=7
X-API-Key: your_api_key
```

## 数据源说明

### Tushare (优先级 1)

**优势:**
- 数据质量高，更新及时
- API 稳定，响应快
- 支持历史数据回测

**限制:**
- 需要注册获取 token
- 免费用户有频率限制（通常为 120 次/分钟）

**配置:**
```env
TUSHARE_TOKEN=your_token_here
```

### AkShare (优先级 2, 降级方案)

**优势:**
- 完全免费，无需注册
- 数据源丰富

**限制:**
- 基于网页爬虫，稳定性相对较低
- 部分接口可能因网站改版而失效

**配置:**
无需配置，默认启用。

## 缓存策略

### 多层缓存架构

| 缓存层 | 存储 | 响应时间 | 有效期 | 说明 |
|-------|------|---------|--------|------|
| L1 | 内存 | <1ms | 动态 TTL | 最快，服务重启后清空 |
| L2 | SQLite | ~10ms | 当日有效 | 持久化，支持搜索 |
| L3 | 数据源 | ~500ms | - | Tushare/AkShare |

### 智能 TTL 策略

| 时间段 | 股票价格 | 基金净值 | 维度数据 |
|--------|---------|---------|---------|
| 盘中 (9:30-15:00) | 2 分钟 | 30 分钟 | 6 小时 |
| 盘后 | 30 分钟 | 6 小时 | 6 小时 |

**说明:**
- 盘中价格变化快，缓存时间短
- 盘后价格稳定，延长缓存减少 API 调用
- 基金每日更新一次，缓存时间更长

## 降级逻辑

1. **首次请求**: 尝试优先级最高的可用数据源（Tushare）
2. **失败处理**: 如果失败或返回空数据，自动切换到下一个数据源（AkShare）
3. **连续失败**: 数据源连续失败 3 次后，标记为不可用
4. **自动恢复**: 通过 `/admin/datasources/health` 端点可重新检查数据源状态

## 部署

### Docker

```bash
# 构建镜像
docker build -t finance-sidecar .

# 运行容器
docker run -d \
  -p 8001:8001 \
  -e API_KEY=your_key \
  -e TUSHARE_TOKEN=your_token \
  finance-sidecar
```

### Railway

项目已配置 `railway.json`，可直接部署到 Railway:

1. 推送代码到 Git 仓库
2. 在 Railway 中连接仓库
3. 配置环境变量 `API_KEY` 和 `TUSHARE_TOKEN`
4. 自动部署

## 性能优化

详细的性能优化指南请参考 [OPTIMIZATION_GUIDE.md](./OPTIMIZATION_GUIDE.md)

### 性能对比

| 场景 | 响应时间 | API 调用 | 用户体验 |
|------|---------|---------|---------|
| 优化前 (直接 API) | 500-2000ms | 每次都调用 | 卡顿 |
| L1 缓存命中 | <1ms | 0 | 极佳 ⚡ |
| L2 缓存命中 | ~10ms | 0 | 流畅 ✨ |
| L3 数据源 | ~500ms | 1 次 | 可接受 |

### 运行性能测试

```bash
pdm run python test_performance.py
```

## 开发

### 项目结构

```
finance/
├── main.py                    # FastAPI 主应用
├── cache_manager.py           # 多层缓存管理器
├── data_sources/              # 数据源抽象层
│   ├── __init__.py
│   ├── base.py               # 数据源基类
│   ├── tushare_source.py     # Tushare 实现
│   ├── akshare_source.py     # AkShare 实现
│   └── manager.py            # 数据源管理器
├── test_datasources.py       # 数据源测试
├── test_performance.py       # 性能测试
├── pyproject.toml            # PDM 依赖配置
├── Dockerfile                # Docker 构建配置
├── README.md                 # 本文档
└── OPTIMIZATION_GUIDE.md     # 性能优化指南
```

### 添加新数据源

1. 在 `data_sources/` 下创建新文件，如 `new_source.py`
2. 继承 `DataSource` 基类并实现所有抽象方法
3. 在 `manager.py` 的 `_initialize_sources()` 中注册新数据源

示例:

```python
from .base import DataSource

class NewDataSource(DataSource):
    def __init__(self):
        super().__init__(priority=3)

    @property
    def name(self) -> str:
        return "NewSource"

    # 实现其他抽象方法...
```

## 许可证

MIT
