## 1. 实体关系图 (ERD) 逻辑

核心逻辑是：**用户 (User)** 拥有多个 **资产账户 (AssetAccount)**。每次 **盘点 (Snapshot)** 实际上是当时所有激活状态账户的一个数值 **详情 (SnapshotItem)** 的集合。

---

## 2. 数据库表设计 (Prisma Schema)

### 2.1 用户表 (User)

用于基础认证和系统注销。

| 字段名 | 类型 | 描述 |
| --- | --- | --- |
| **id** | UUID | 主键 |
| **email** | String | 登录邮箱，唯一 |
| **password** | String | 哈希后的密码 |
| **baseCurrency** | String | 用户选定的基准货币，默认 "CNY" |
| **createdAt** | DateTime | 注册时间 |

### 2.2 资产账户表 (AssetAccount)

这是你的资产字典，存储账户的元数据和自动化配置。

| 字段名 | 类型 | 描述 |
| --- | --- | --- |
| **id** | UUID | 主键 |
| **userId** | UUID | 关联用户 |
| **name** | String | 账户名称（如：招行代发、Tesla Model 3） |
| **category** | Enum | 分类：`CASH`, `STOCK`, `REAL_ESTATE`, `LIABILITY` |
| **currency** | String | 该账户的原始币种（如 "USD", "HKD"） |
| **isArchived** | Boolean | 是否已归档，默认 `false` |
| **autoConfig** | JSONB | **关键字段**：存储自动化参数（见下方详解） |
| **createdAt** | DateTime | 创建时间 |

> **`autoConfig` 内部结构建议：**
> * **固定资产折旧：** `{ "type": "depreciation", "buyPrice": 50000, "buyDate": "2024-01-01", "totalMonths": 60 }`
> * **负债摊销：** `{ "type": "amortization", "monthlyPayment": 8000, "paymentDay": 20 }`
> 
> 

### 2.3 盘点快照主表 (Snapshot)

记录每次盘点的元数据，用于时间轴导航和历史列表。

| 字段名 | 类型 | 描述 |
| --- | --- | --- |
| **id** | UUID | 主键 |
| **userId** | UUID | 关联用户 |
| **snapDate** | Date | **关键字段**：盘点日期（同一天建议唯一，或由逻辑覆盖） |
| **totalNetWorth** | Decimal | 冗余字段：该次盘点的总净资产（CNY） |
| **totalAssets** | Decimal | 冗余字段：总资产值 |
| **totalLiabilities** | Decimal | 冗余字段：总负债值 |

### 2.4 盘点快照详情表 (SnapshotItem)

这是数据量最大、也是最核心的表，记录了盘点那一刻每个账户的真实状态。

| 字段名 | 类型 | 描述 |
| --- | --- | --- |
| **id** | UUID | 主键 |
| **snapshotId** | UUID | 关联快照主表（设置 `ON DELETE CASCADE`） |
| **assetAccountId** | UUID | 关联具体的资产账户 |
| **originalAmount** | Decimal | 盘点时刻的原始币种金额 |
| **exchangeRate** | Decimal | **关键字段**：锁定当天的汇率（原始币种 -> CNY） |
| **valuation** | Decimal | 换算后的基准币价值（） |

---

## 3. 设计亮点说明

1. **锁定汇率的必要性：** 在 `SnapshotItem` 中存储 `exchangeRate`。即使汇率 API 未来失效或汇率大幅波动，你 2025 年 1 月盘点的数据永远不会变。
2. **冗余统计字段：** 在 `Snapshot` 表中存储总资产、总负债。这可以极大提升主界面“12个月趋势图”的查询速度，无需每次都 JOIN 几十条详情数据进行累加。
3. **JSONB 的灵活性：** 资产账户的自动化配置各不相同，使用 JSONB 可以兼容未来更多的自动化策略（比如股票自动同步 API 的配置），而无需修改表结构。

---

## 4. 关键索引建议 (Performance)

* `Snapshot`: `(userId, snapDate)` 复合唯一索引。确保一个用户在同一天原则上只有一个“最终快照”。
* `SnapshotItem`: `(snapshotId)` 索引。加快左右滑屏时查询详情的速度。
* `AssetAccount`: `(userId, isArchived)` 索引。加快录入界面拉取账户清单的速度。

---