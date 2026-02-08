import { useState, useRef, useEffect, useCallback } from "react";
import { View, ScrollView, TextInput, ActivityIndicator, Pressable } from "react-native";
import Animated, {
  FadeInDown,
  Layout,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Sheet, type SheetRef } from "@/components/ui/sheet";
import { showToast } from "@/components/ui/toast";
import { formatCurrency } from "@/lib/utils";
import { getCategoryColor, hslToRgba } from "@/lib/colors";
import { useSnapshotDraftStore, type AssetSnapshotDraft } from "@/stores/snapshotDraftStore";
import { useAssets } from "@/hooks/useAssets";
import { useSnapshots } from "@/hooks/useSnapshots";
import { useUserStore } from "@/stores/userStore";
import { fetchPrice } from "@/lib/services/price";
import { getExchangeRate } from "@/lib/currency";
import { calculateDepreciation, calculateLoanAmortization } from "@/lib/logic/calculator";

// 资产类别图标
const CATEGORY_ICONS: Record<string, string> = {
  CASH: "💵",
  STOCK: "📈",
  FUND: "📊",
  BOND: "📄",
  CRYPTO: "₿",
  REAL_ESTATE: "🏠",
  VEHICLE: "🚗",
  PRECIOUS_METAL: "🥇",
  COLLECTIBLE: "🎨",
  LIABILITY: "💳",
  OTHER: "📦",
};

// 单个资产自动估值超时
const AUTO_VALUATION_TIMEOUT = 10000;

interface SnapWizardProps {
  onClose: () => void;
}

/**
 * Snap 资产盘点向导
 * 全屏 Sheet 模式，用于记录资产快照
 */
export function SnapWizard({ onClose }: SnapWizardProps) {
  const sheetRef = useRef<SheetRef>(null);
  const { activeAssets } = useAssets();
  const { createSnapshot, latestSnapshot } = useSnapshots();
  const { baseCurrency } = useUserStore();

  const {
    drafts,
    date,
    note,
    step,
    setDrafts,
    setDate,
    setNote,
    setStep,
    updateDraftValue,
    updateDraftQuantity,
    updateDraftPrice,
    getTotalNetWorth,
    reset,
  } = useSnapshotDraftStore();

  // 打开时加载数据
  useEffect(() => {
    sheetRef.current?.snapTo(1); // 展开到 90%
    loadDrafts();
  }, []);

  const loadDrafts = async () => {
    setStep("LOADING");

    // 并行自动估值每个资产，每个独立超时
    const assetDrafts = await Promise.all(
      activeAssets.map(async (asset) => {
        // 上次快照值作为 fallback
        const prevItem = latestSnapshot?.items.find(
          (item) => item.assetAccountId === asset.id
        );

        const fallbackValue = prevItem?.value ?? 0;
        const fallbackQuantity = prevItem?.quantity ?? undefined;
        const fallbackPrice = prevItem?.price ?? undefined;
        const fallbackRate = prevItem?.exchangeRate ?? 1;

        let currentValue = fallbackValue;
        let quantity = fallbackQuantity;
        let price = fallbackPrice;
        let exchangeRate = fallbackRate;

        try {
          // 带超时的自动估值
          const result = await Promise.race([
            autoValuate(asset, prevItem, baseCurrency),
            new Promise<null>((resolve) =>
              setTimeout(() => resolve(null), AUTO_VALUATION_TIMEOUT)
            ),
          ]);

          if (result) {
            currentValue = result.value;
            quantity = result.quantity;
            price = result.price;
            exchangeRate = result.exchangeRate;
          }
        } catch {
          // 自动估值失败，使用 fallback
        }

        return {
          assetId: asset.id,
          name: asset.name,
          category: asset.category,
          currency: asset.currency,
          currentValue,
          previousValue: fallbackValue,
          quantity,
          price,
          exchangeRate,
          isDirty: currentValue !== fallbackValue,
          type: asset.category === "LIABILITY" ? "LIABILITY" : "ASSET",
        } as AssetSnapshotDraft;
      })
    );

    setDrafts(assetDrafts);
    setStep("REVIEW");
  };

  const handleSave = async () => {
    setStep("SAVING");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      await createSnapshot(drafts, date, note || undefined);
      reset();
      onClose();
    } catch (error) {
      showToast.error("保存失败", "请稍后重试");
      setStep("REVIEW");
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const totalNetWorth = getTotalNetWorth();

  return (
    <Sheet
      ref={sheetRef}
      snapPoints={["50%", "90%"]}
      title="创建快照"
      onClose={handleClose}
    >
      <View className="flex-1">
        {step === "LOADING" && (
          <View className="flex-1 items-center justify-center py-12">
            <ActivityIndicator size="large" />
            <Text color="muted" className="mt-4">
              正在获取最新估值...
            </Text>
          </View>
        )}

        {step === "REVIEW" && (
          <ScrollView
            className="flex-1"
            contentContainerClassName="px-4 pb-24"
            showsVerticalScrollIndicator={false}
          >
            {/* 日期选择 */}
            <View className="flex-row items-center gap-4 mb-6">
              <Text weight="medium">日期</Text>
              <View className="flex-1">
                <Input
                  value={date}
                  onChangeText={setDate}
                  placeholder="YYYY-MM-DD"
                />
              </View>
            </View>

            {/* 资产列表 */}
            <View className="gap-3">
              {drafts.map((asset, index) => (
                <AssetDraftCard
                  key={asset.assetId}
                  asset={asset}
                  index={index}
                  onValueChange={(val) => updateDraftValue(asset.assetId, val)}
                  onQuantityChange={(val) => updateDraftQuantity(asset.assetId, val)}
                  onPriceChange={(val) => updateDraftPrice(asset.assetId, val)}
                />
              ))}
            </View>

            {/* 预计总净值 */}
            {drafts.length > 0 && (
              <View className="bg-muted rounded-2xl p-4 mt-6 flex-row justify-between items-center">
                <Text weight="bold">预计总净值</Text>
                <Text variant="title" weight="bold">
                  {formatCurrency(totalNetWorth)}
                </Text>
              </View>
            )}

            {drafts.length === 0 && (
              <View className="items-center py-12">
                <Text color="muted">未找到活跃资产</Text>
                <Text variant="caption" color="muted" className="mt-1">
                  请前往设置添加资产账户
                </Text>
              </View>
            )}

            {/* 备注 */}
            <View className="mt-6">
              <Text variant="label" color="muted" className="mb-2">
                备注（可选）
              </Text>
              <Input
                value={note}
                onChangeText={setNote}
                placeholder="添加快照备注..."
                multiline
                numberOfLines={2}
              />
            </View>
          </ScrollView>
        )}

        {step === "SAVING" && (
          <View className="flex-1 items-center justify-center py-12">
            <ActivityIndicator size="large" />
            <Text color="muted" className="mt-4">
              正在保存快照...
            </Text>
          </View>
        )}

        {/* 底部操作按钮 */}
        {step === "REVIEW" && (
          <View className="absolute bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
            <Button
              onPress={handleSave}
              disabled={drafts.length === 0}
              size="lg"
            >
              确认快照
            </Button>
          </View>
        )}
      </View>
    </Sheet>
  );
}

/**
 * 自动估值逻辑
 * 优先级: symbol+quantity → autoConfig(depreciation/loan) → 上次值
 */
async function autoValuate(
  asset: {
    id: string;
    symbol?: string | null;
    market?: string | null;
    quantity?: number | null;
    currency: string;
    autoConfig?: any;
  },
  prevItem: { value: number; quantity?: number | null; price?: number | null; exchangeRate: number } | undefined,
  baseCurrency: string
): Promise<{
  value: number;
  quantity?: number;
  price?: number;
  exchangeRate: number;
} | null> {
  let value: number | null = null;
  let quantity: number | undefined;
  let price: number | undefined;

  // 1. 有 symbol + quantity → 拉取实时报价
  if (asset.symbol && asset.quantity && asset.quantity > 0) {
    const priceResult = await fetchPrice(asset.symbol, asset.market);
    if (priceResult) {
      price = priceResult.price;
      quantity = asset.quantity;
      value = price * quantity;
    }
  }

  // 2. 有 autoConfig → 自动计算
  if (value === null && asset.autoConfig) {
    const config = typeof asset.autoConfig === "string"
      ? JSON.parse(asset.autoConfig)
      : asset.autoConfig;

    if (config.type === "depreciation") {
      value = calculateDepreciation(
        config.purchasePrice,
        config.purchaseDate,
        config.lifespanMonths,
        config.salvageValue ?? 0
      );
    } else if (config.type === "loan") {
      value = calculateLoanAmortization(
        config.initialLoan,
        config.monthlyPayment,
        config.startDate
      );
    }
  }

  // 3. 都没有 → 返回 null (调用方使用 fallback)
  if (value === null) return null;

  // 4. 获取汇率
  let exchangeRate = 1;
  if (asset.currency !== baseCurrency) {
    try {
      exchangeRate = await getExchangeRate(asset.currency, baseCurrency);
    } catch {
      exchangeRate = prevItem?.exchangeRate ?? 1;
    }
  }

  return { value, quantity, price, exchangeRate };
}

/**
 * 资产 Draft 卡片
 */
function AssetDraftCard({
  asset,
  index,
  onValueChange,
  onQuantityChange,
  onPriceChange,
}: {
  asset: AssetSnapshotDraft;
  index: number;
  onValueChange: (val: number) => void;
  onQuantityChange: (val: number) => void;
  onPriceChange: (val: number) => void;
}) {
  const bgColor = hslToRgba(getCategoryColor(asset.category), 0.1);
  const isInvestment = asset.quantity !== undefined && asset.price !== undefined;

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 50).springify()}
      layout={Layout.springify()}
    >
      <Card
        variant="outline"
        className="p-4"
        style={asset.isDirty ? { borderColor: "#22c55e" } : {}}
      >
        <View className="flex-row items-center gap-3 mb-3">
          {/* Icon */}
          <View
            className="w-10 h-10 rounded-xl items-center justify-center"
            style={{ backgroundColor: bgColor }}
          >
            <Text className="text-lg">
              {CATEGORY_ICONS[asset.category] || "📦"}
            </Text>
          </View>

          {/* Name and type */}
          <View className="flex-1">
            <Text weight="bold">{asset.name}</Text>
            <Text variant="caption" color="muted">
              {asset.type === "LIABILITY" ? "负债" : "资产"} · {asset.currency}
              {asset.exchangeRate !== 1 && ` · 汇率 ${asset.exchangeRate.toFixed(4)}`}
            </Text>
          </View>
        </View>

        {isInvestment ? (
          // 投资类资产：数量 × 单价
          <View className="gap-2">
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text variant="caption" color="muted" className="mb-1">
                  数量
                </Text>
                <TextInput
                  className="h-10 px-3 rounded-lg border border-border text-foreground"
                  keyboardType="numeric"
                  value={String(asset.quantity || "")}
                  onChangeText={(text) => {
                    const val = parseFloat(text);
                    if (!isNaN(val)) onQuantityChange(val);
                  }}
                />
              </View>
              <View className="flex-1">
                <Text variant="caption" color="muted" className="mb-1">
                  单价
                </Text>
                <TextInput
                  className="h-10 px-3 rounded-lg border border-border text-foreground"
                  keyboardType="numeric"
                  value={String(asset.price || "")}
                  onChangeText={(text) => {
                    const val = parseFloat(text);
                    if (!isNaN(val)) onPriceChange(val);
                  }}
                />
              </View>
            </View>
            <Text variant="caption" color="muted" className="text-right">
              = {formatCurrency(asset.currentValue)} {asset.currency}
            </Text>
          </View>
        ) : (
          // 普通资产：直接输入金额
          <TextInput
            className="h-12 px-4 rounded-xl border border-border text-foreground text-lg"
            keyboardType="numeric"
            value={String(asset.currentValue)}
            onChangeText={(text) => {
              const val = parseFloat(text);
              if (!isNaN(val)) onValueChange(val);
            }}
          />
        )}

        {/* 变化提示 */}
        {asset.previousValue !== asset.currentValue && (
          <Text
            variant="caption"
            className={`mt-2 ${asset.currentValue > asset.previousValue
                ? "text-green-500"
                : "text-red-500"
              }`}
          >
            {asset.currentValue > asset.previousValue ? "↑" : "↓"}{" "}
            {formatCurrency(Math.abs(asset.currentValue - asset.previousValue))}
          </Text>
        )}
      </Card>
    </Animated.View>
  );
}

/**
 * Hook 方式使用
 */
export function useSnapWizard() {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  return {
    isOpen,
    open,
    close,
    Wizard: isOpen ? (
      <SnapWizard onClose={close} />
    ) : null,
  };
}
