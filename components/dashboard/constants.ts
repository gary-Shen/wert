export const CATEGORY_LABELS: Record<string, string> = {
  CASH: "现金",
  STOCK: "股票",
  FUND: "基金",
  BOND: "债券",
  REAL_ESTATE: "房产",
  LIABILITY: "负债",
  CRYPTO: "加密货币",
  VEHICLE: "交通工具",
  PRECIOUS_METAL: "贵金属",
  COLLECTIBLE: "收藏品",
  Other: "其他",
};

export const getCategoryLabel = (key: string | undefined): string => {
  if (!key) return "其他";
  return CATEGORY_LABELS[key] || key;
};
