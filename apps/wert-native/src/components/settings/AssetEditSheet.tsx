import { useState, useRef } from "react";
import { View, ScrollView, Pressable } from "react-native";
import * as Haptics from "expo-haptics";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Sheet, type SheetRef } from "@/components/ui/sheet";
import { showToast } from "@/components/ui/toast";
import { getCategoryColor, hslToRgba } from "@/lib/colors";
import { useAssets } from "@/hooks/useAssets";
import type { AssetAccount } from "@/stores/assetsStore";
import type { AssetCategory } from "@/db/schema";

// 货币选项
const CURRENCIES = [
  { value: "CNY", label: "CNY", flag: "🇨🇳" },
  { value: "USD", label: "USD", flag: "🇺🇸" },
  { value: "HKD", label: "HKD", flag: "🇭🇰" },
  { value: "EUR", label: "EUR", flag: "🇪🇺" },
  { value: "JPY", label: "JPY", flag: "🇯🇵" },
];

// 市场选项
const MARKETS = [
  { value: "CN", label: "中国 A股" },
  { value: "HK", label: "香港" },
  { value: "US", label: "美国" },
];

// 资产类别
const ASSET_CATEGORIES: Array<{ value: AssetCategory; label: string; icon: string }> = [
  { value: "CASH", label: "现金", icon: "💵" },
  { value: "BANK_DEPOSIT", label: "银行存款", icon: "🏦" },
  { value: "STOCK", label: "股票", icon: "📈" },
  { value: "FUND", label: "基金", icon: "📊" },
  { value: "BOND", label: "债券", icon: "📜" },
  { value: "CRYPTO", label: "加密货币", icon: "₿" },
  { value: "REAL_ESTATE", label: "房产", icon: "🏠" },
  { value: "VEHICLE", label: "车辆", icon: "🚗" },
  { value: "INSURANCE", label: "保险", icon: "🛡️" },
  { value: "PRECIOUS_METAL", label: "贵金属", icon: "🥇" },
  { value: "OTHER", label: "其他资产", icon: "📦" },
  { value: "LIABILITY", label: "负债", icon: "💳" },
];

// 判断是否是投资类资产
function isInvestmentCategory(category: AssetCategory): boolean {
  return ["STOCK", "FUND", "BOND", "CRYPTO"].includes(category);
}

// 判断是否是固定资产类
function isFixedAssetCategory(category: AssetCategory): boolean {
  return ["REAL_ESTATE", "VEHICLE"].includes(category);
}

// 判断是否是负债类
function isLiabilityCategory(category: AssetCategory): boolean {
  return category === "LIABILITY";
}

interface AssetEditSheetProps {
  asset: AssetAccount;
  onClose: () => void;
}

/**
 * 资产编辑 Bottom Sheet
 */
export function AssetEditSheet({ asset, onClose }: AssetEditSheetProps) {
  const sheetRef = useRef<SheetRef>(null);
  const { updateAsset } = useAssets();
  const [isSaving, setIsSaving] = useState(false);

  // 基础字段
  const [name, setName] = useState(asset.name);
  const [category, setCategory] = useState<AssetCategory>(asset.category);
  const [currency, setCurrency] = useState(asset.currency);
  const [symbol, setSymbol] = useState(asset.symbol || "");
  const [market, setMarket] = useState(asset.market || "");

  // 投资类字段
  const [quantity, setQuantity] = useState(
    asset.quantity != null ? String(asset.quantity) : ""
  );
  const [costBasis, setCostBasis] = useState(
    asset.costBasis != null ? String(asset.costBasis) : ""
  );

  // autoConfig
  const existingConfig =
    asset.autoConfig && typeof asset.autoConfig === "object"
      ? asset.autoConfig
      : asset.autoConfig && typeof asset.autoConfig === "string"
        ? (() => { try { return JSON.parse(asset.autoConfig); } catch { return null; } })()
        : null;

  // 折旧参数
  const [purchasePrice, setPurchasePrice] = useState(
    existingConfig?.purchasePrice != null ? String(existingConfig.purchasePrice) : ""
  );
  const [purchaseDate, setPurchaseDate] = useState(
    existingConfig?.purchaseDate || ""
  );
  const [lifespanMonths, setLifespanMonths] = useState(
    existingConfig?.lifespanMonths != null ? String(existingConfig.lifespanMonths) : ""
  );
  const [salvageValue, setSalvageValue] = useState(
    existingConfig?.salvageValue != null ? String(existingConfig.salvageValue) : ""
  );

  // 贷款参数
  const [initialLoan, setInitialLoan] = useState(
    existingConfig?.initialLoan != null ? String(existingConfig.initialLoan) : ""
  );
  const [monthlyPayment, setMonthlyPayment] = useState(
    existingConfig?.monthlyPayment != null ? String(existingConfig.monthlyPayment) : ""
  );
  const [loanStartDate, setLoanStartDate] = useState(
    existingConfig?.startDate || ""
  );

  const handleSave = async () => {
    if (!name.trim()) {
      showToast.error("请输入资产名称");
      return;
    }

    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // 构建 autoConfig
      let autoConfig: any = null;

      if (isFixedAssetCategory(category) && purchasePrice && purchaseDate && lifespanMonths) {
        autoConfig = {
          type: "depreciation",
          purchasePrice: parseFloat(purchasePrice),
          purchaseDate,
          lifespanMonths: parseInt(lifespanMonths, 10),
          salvageValue: salvageValue ? parseFloat(salvageValue) : 0,
        };
      } else if (isLiabilityCategory(category) && initialLoan && monthlyPayment && loanStartDate) {
        autoConfig = {
          type: "loan",
          initialLoan: parseFloat(initialLoan),
          monthlyPayment: parseFloat(monthlyPayment),
          startDate: loanStartDate,
        };
      }

      await updateAsset(asset.id, {
        name: name.trim(),
        category,
        currency,
        symbol: symbol.trim() || null,
        market: market || null,
        quantity: quantity ? parseFloat(quantity) : null,
        costBasis: costBasis ? parseFloat(costBasis) : null,
        autoConfig,
      });

      onClose();
    } catch {
      showToast.error("保存失败");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sheet
      ref={sheetRef}
      snapPoints={["70%", "92%"]}
      title="编辑资产"
      onClose={onClose}
    >
      <View className="flex-1">
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-4 pb-24"
          showsVerticalScrollIndicator={false}
        >
          {/* 名称 */}
          <View className="mb-4">
            <Text variant="label" color="muted" className="mb-2">
              资产名称
            </Text>
            <Input value={name} onChangeText={setName} placeholder="资产名称" />
          </View>

          {/* 类别选择 */}
          <View className="mb-4">
            <Text variant="label" color="muted" className="mb-2">
              类别
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="gap-2"
            >
              {ASSET_CATEGORIES.map((cat) => {
                const isSelected = category === cat.value;
                const color = getCategoryColor(cat.value);
                return (
                  <Pressable
                    key={cat.value}
                    onPress={() => setCategory(cat.value)}
                    className={`px-3 py-2 rounded-lg flex-row items-center gap-1 ${
                      isSelected ? "border-2 border-primary" : "border border-border"
                    }`}
                    style={
                      isSelected ? { backgroundColor: hslToRgba(color, 0.1) } : undefined
                    }
                  >
                    <Text>{cat.icon}</Text>
                    <Text variant="caption" weight={isSelected ? "bold" : "medium"}>
                      {cat.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* 货币 */}
          <View className="mb-4">
            <Text variant="label" color="muted" className="mb-2">
              货币
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {CURRENCIES.map((curr) => {
                const isSelected = currency === curr.value;
                return (
                  <Pressable
                    key={curr.value}
                    onPress={() => setCurrency(curr.value)}
                    className={`px-3 py-2 rounded-lg flex-row items-center gap-1 ${
                      isSelected ? "bg-primary" : "bg-muted"
                    }`}
                  >
                    <Text>{curr.flag}</Text>
                    <Text
                      variant="caption"
                      weight={isSelected ? "bold" : "medium"}
                      className={isSelected ? "text-primary-foreground" : ""}
                    >
                      {curr.value}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* 投资类字段 */}
          {isInvestmentCategory(category) && (
            <Card variant="outline" className="p-4 mb-4">
              <Text weight="bold" className="mb-3">
                投资参数
              </Text>

              <View className="mb-3">
                <Text variant="caption" color="muted" className="mb-1">
                  代码 (Symbol)
                </Text>
                <Input
                  value={symbol}
                  onChangeText={setSymbol}
                  placeholder="如 AAPL、600519"
                />
              </View>

              <View className="mb-3">
                <Text variant="caption" color="muted" className="mb-2">
                  市场
                </Text>
                <View className="flex-row gap-2">
                  {MARKETS.map((m) => {
                    const isSelected = market === m.value;
                    return (
                      <Pressable
                        key={m.value}
                        onPress={() => setMarket(m.value)}
                        className={`px-3 py-2 rounded-lg ${
                          isSelected ? "bg-primary" : "bg-muted"
                        }`}
                      >
                        <Text
                          variant="caption"
                          weight={isSelected ? "bold" : "medium"}
                          className={isSelected ? "text-primary-foreground" : ""}
                        >
                          {m.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Text variant="caption" color="muted" className="mb-1">
                    持仓数量
                  </Text>
                  <Input
                    value={quantity}
                    onChangeText={setQuantity}
                    placeholder="0"
                    keyboardType="numeric"
                  />
                </View>
                <View className="flex-1">
                  <Text variant="caption" color="muted" className="mb-1">
                    成本价
                  </Text>
                  <Input
                    value={costBasis}
                    onChangeText={setCostBasis}
                    placeholder="0"
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </Card>
          )}

          {/* 固定资产折旧配置 */}
          {isFixedAssetCategory(category) && (
            <Card variant="outline" className="p-4 mb-4">
              <Text weight="bold" className="mb-3">
                折旧参数（可选）
              </Text>
              <Text variant="caption" color="muted" className="mb-3">
                填写后创建快照时将自动按直线法计算折旧
              </Text>

              <View className="flex-row gap-3 mb-3">
                <View className="flex-1">
                  <Text variant="caption" color="muted" className="mb-1">
                    购入价格
                  </Text>
                  <Input
                    value={purchasePrice}
                    onChangeText={setPurchasePrice}
                    placeholder="0"
                    keyboardType="numeric"
                  />
                </View>
                <View className="flex-1">
                  <Text variant="caption" color="muted" className="mb-1">
                    购入日期
                  </Text>
                  <Input
                    value={purchaseDate}
                    onChangeText={setPurchaseDate}
                    placeholder="YYYY-MM-DD"
                  />
                </View>
              </View>

              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Text variant="caption" color="muted" className="mb-1">
                    使用年限(月)
                  </Text>
                  <Input
                    value={lifespanMonths}
                    onChangeText={setLifespanMonths}
                    placeholder="如 120"
                    keyboardType="numeric"
                  />
                </View>
                <View className="flex-1">
                  <Text variant="caption" color="muted" className="mb-1">
                    残值
                  </Text>
                  <Input
                    value={salvageValue}
                    onChangeText={setSalvageValue}
                    placeholder="0"
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </Card>
          )}

          {/* 负债贷款配置 */}
          {isLiabilityCategory(category) && (
            <Card variant="outline" className="p-4 mb-4">
              <Text weight="bold" className="mb-3">
                贷款参数（可选）
              </Text>
              <Text variant="caption" color="muted" className="mb-3">
                填写后创建快照时将自动计算剩余本金
              </Text>

              <View className="mb-3">
                <Text variant="caption" color="muted" className="mb-1">
                  初始贷款总额
                </Text>
                <Input
                  value={initialLoan}
                  onChangeText={setInitialLoan}
                  placeholder="0"
                  keyboardType="numeric"
                />
              </View>

              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Text variant="caption" color="muted" className="mb-1">
                    每月还款额
                  </Text>
                  <Input
                    value={monthlyPayment}
                    onChangeText={setMonthlyPayment}
                    placeholder="0"
                    keyboardType="numeric"
                  />
                </View>
                <View className="flex-1">
                  <Text variant="caption" color="muted" className="mb-1">
                    还款起始日
                  </Text>
                  <Input
                    value={loanStartDate}
                    onChangeText={setLoanStartDate}
                    placeholder="YYYY-MM-DD"
                  />
                </View>
              </View>
            </Card>
          )}

          {/* 非投资类也允许设置 symbol（如加密货币手动配市场） */}
          {!isInvestmentCategory(category) &&
            !isFixedAssetCategory(category) &&
            !isLiabilityCategory(category) && (
              <View className="mb-4">
                <Text variant="caption" color="muted" className="mb-1">
                  代码（可选，用于自动报价）
                </Text>
                <Input
                  value={symbol}
                  onChangeText={setSymbol}
                  placeholder="如 BTC-USD"
                />
              </View>
            )}
        </ScrollView>

        {/* 底部保存 */}
        <View className="absolute bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
          <View className="flex-row gap-3">
            <Button variant="outline" className="flex-1" onPress={onClose}>
              取消
            </Button>
            <Button
              className="flex-1"
              onPress={handleSave}
              disabled={isSaving}
            >
              {isSaving ? "保存中..." : "保存"}
            </Button>
          </View>
        </View>
      </View>
    </Sheet>
  );
}
