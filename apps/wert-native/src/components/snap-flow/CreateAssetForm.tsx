import { useState, useRef, useCallback } from "react";
import { View, ScrollView, Pressable } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Sheet, type SheetRef } from "@/components/ui/sheet";
import { showToast } from "@/components/ui/toast";
import { getCategoryColor, hslToRgba } from "@/lib/colors";
import { useAssets } from "@/hooks/useAssets";
import type { AssetCategory } from "@/db/schema";

// 资产类别选项
const ASSET_CATEGORIES: { value: AssetCategory; label: string; icon: string }[] = [
  { value: "CASH", label: "现金", icon: "💵" },
  { value: "STOCK", label: "股票", icon: "📈" },
  { value: "FUND", label: "基金", icon: "📊" },
  { value: "BOND", label: "债券", icon: "📄" },
  { value: "CRYPTO", label: "加密货币", icon: "₿" },
  { value: "REAL_ESTATE", label: "房产", icon: "🏠" },
  { value: "VEHICLE", label: "车辆", icon: "🚗" },
  { value: "PRECIOUS_METAL", label: "贵金属", icon: "🥇" },
  { value: "COLLECTIBLE", label: "收藏品", icon: "🎨" },
  { value: "LIABILITY", label: "负债", icon: "💳" },
];

// 货币选项
const CURRENCIES = [
  { value: "CNY", label: "人民币 (CNY)" },
  { value: "USD", label: "美元 (USD)" },
  { value: "HKD", label: "港币 (HKD)" },
  { value: "EUR", label: "欧元 (EUR)" },
  { value: "JPY", label: "日元 (JPY)" },
];

interface AssetFormData {
  name: string;
  category: AssetCategory;
  currency: string;
  symbol?: string;
  market?: string;
  initialValue?: number;
}

interface CreateAssetFormProps {
  onClose: () => void;
}

/**
 * 创建资产表单
 */
export function CreateAssetForm({ onClose }: CreateAssetFormProps) {
  const sheetRef = useRef<SheetRef>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { createAsset } = useAssets();

  const [formData, setFormData] = useState<AssetFormData>({
    name: "",
    category: "CASH",
    currency: "CNY",
  });

  const updateField = <K extends keyof AssetFormData>(
    key: K,
    value: AssetFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      showToast.error("请输入资产名称");
      return;
    }

    setIsLoading(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      await createAsset({
        name: formData.name,
        category: formData.category,
        currency: formData.currency,
        symbol: formData.symbol,
        market: formData.market,
      });
      onClose();
    } catch (error) {
      showToast.error("创建失败", "请稍后重试");
    } finally {
      setIsLoading(false);
    }
  };

  const isInvestment = ["STOCK", "FUND", "CRYPTO"].includes(formData.category);

  return (
    <Sheet
      ref={sheetRef}
      snapPoints={["70%", "90%"]}
      title="创建资产"
      onClose={onClose}
    >
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-24"
        showsVerticalScrollIndicator={false}
      >
        {/* 资产名称 */}
        <View className="mb-6">
          <Input
            label="资产名称"
            value={formData.name}
            onChangeText={(val) => updateField("name", val)}
            placeholder="例如：招商银行储蓄卡"
          />
        </View>

        {/* 资产类别 */}
        <View className="mb-6">
          <Text variant="label" color="muted" className="mb-3">
            资产类别
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {ASSET_CATEGORIES.map((cat) => {
              const isSelected = formData.category === cat.value;
              const bgColor = hslToRgba(
                getCategoryColor(cat.value),
                isSelected ? 0.2 : 0.08
              );

              return (
                <Pressable
                  key={cat.value}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    updateField("category", cat.value);
                  }}
                  className={`px-4 py-2 rounded-full flex-row items-center gap-2 ${isSelected ? "border-2 border-primary" : "border border-border"
                    }`}
                  style={{ backgroundColor: bgColor }}
                >
                  <Text>{cat.icon}</Text>
                  <Text
                    weight={isSelected ? "bold" : "medium"}
                    className={isSelected ? "text-primary" : ""}
                  >
                    {cat.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* 货币 */}
        <View className="mb-6">
          <Text variant="label" color="muted" className="mb-3">
            货币
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {CURRENCIES.map((curr) => {
              const isSelected = formData.currency === curr.value;
              return (
                <Pressable
                  key={curr.value}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    updateField("currency", curr.value);
                  }}
                  className={`px-4 py-2 rounded-full ${isSelected
                      ? "bg-primary"
                      : "bg-muted border border-border"
                    }`}
                >
                  <Text
                    weight={isSelected ? "bold" : "medium"}
                    className={isSelected ? "text-primary-foreground" : ""}
                  >
                    {curr.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* 投资类资产额外字段 */}
        {isInvestment && (
          <Animated.View entering={FadeInDown.springify()}>
            <Card variant="outline" className="p-4 mb-6">
              <Text weight="medium" className="mb-4">
                投资信息（可选）
              </Text>
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Input
                    label="股票代码"
                    value={formData.symbol || ""}
                    onChangeText={(val) => updateField("symbol", val)}
                    placeholder="如 AAPL"
                  />
                </View>
                <View className="flex-1">
                  <Input
                    label="市场"
                    value={formData.market || ""}
                    onChangeText={(val) => updateField("market", val)}
                    placeholder="如 US/HK/CN"
                  />
                </View>
              </View>
            </Card>
          </Animated.View>
        )}

        {/* 初始值 */}
        <View className="mb-6">
          <Input
            label="初始价值（可选）"
            value={formData.initialValue ? String(formData.initialValue) : ""}
            onChangeText={(val) => {
              const num = parseFloat(val);
              updateField("initialValue", isNaN(num) ? undefined : num);
            }}
            keyboardType="numeric"
            placeholder="0"
          />
        </View>
      </ScrollView>

      {/* 保存按钮 */}
      <View className="absolute bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
        <Button onPress={handleSave} loading={isLoading} size="lg">
          创建资产
        </Button>
      </View>
    </Sheet>
  );
}

/**
 * Hook 方式使用
 */
export function useCreateAssetForm() {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  return {
    isOpen,
    open,
    close,
    Form: isOpen ? (
      <CreateAssetForm onClose={close} />
    ) : null,
  };
}
