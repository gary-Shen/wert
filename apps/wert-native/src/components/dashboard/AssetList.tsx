import { useState } from "react";
import { View, Pressable, ScrollView } from "react-native";
import Animated, {
  FadeInDown,
  Layout,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Text } from "@/components/ui/text";
import { Card } from "@/components/ui/card";
import { formatCurrency, formatPercentage } from "@/lib/utils";
import { getCategoryColor, hslToRgba } from "@/lib/colors";
import type { ChartData } from "@/types/dashboard";

// 资产类别标签映射
const CATEGORY_LABELS: Record<string, string> = {
  CASH: "现金",
  STOCK: "股票",
  FUND: "基金",
  BOND: "债券",
  CRYPTO: "加密货币",
  REAL_ESTATE: "房产",
  VEHICLE: "车辆",
  PRECIOUS_METAL: "贵金属",
  COLLECTIBLE: "收藏品",
  LIABILITY: "负债",
  OTHER: "其他",
};

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

interface AssetListProps {
  data: ChartData[];
  showAmount?: boolean;
}

/**
 * 资产明细列表组件
 */
export function AssetList({ data, showAmount = true }: AssetListProps) {
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  // Sort assets
  const sortedAssets = [...data]
    .filter((item) => item.value > 0)
    .sort((a, b) =>
      sortOrder === "desc" ? b.value - a.value : a.value - b.value
    );

  // Calculate total for percentages
  const total = data.reduce((sum, item) => sum + item.value, 0);

  const toggleSort = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"));
  };

  const displayValue = (val: number) => {
    if (!showAmount) return "****";
    return formatCurrency(val);
  };

  if (sortedAssets.length === 0) {
    return (
      <View className="items-center justify-center p-8">
        <Text color="muted">暂无资产数据</Text>
      </View>
    );
  }

  return (
    <View className="w-full">
      {/* Header */}
      <View className="flex-row justify-between items-center mb-4">
        <Text variant="title" weight="bold">
          资产明细
        </Text>
        <Pressable
          onPress={toggleSort}
          className="p-2 rounded-lg active:bg-accent"
        >
          <Text color="muted">
            {sortOrder === "desc" ? "⬇️" : "⬆️"}
          </Text>
        </Pressable>
      </View>

      {/* Asset Items */}
      <View className="gap-3">
        {sortedAssets.map((item, index) => {
          const category = item.category || "OTHER";
          const percent = total > 0 ? (item.value / total) * 100 : 0;
          const baseColor = getCategoryColor(category);
          const bgColor = hslToRgba(baseColor, 0.15);
          const iconColor = hslToRgba(baseColor, 1);

          return (
            <Animated.View
              key={item.name}
              entering={FadeInDown.delay(index * 50).springify()}
              layout={Layout.springify()}
            >
              <Card variant="outline" className="p-4">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-4 flex-1">
                    {/* Icon */}
                    <View
                      className="w-10 h-10 rounded-xl items-center justify-center"
                      style={{ backgroundColor: bgColor }}
                    >
                      <Text className="text-lg">
                        {CATEGORY_ICONS[category] || "📦"}
                      </Text>
                    </View>

                    {/* Name and percentage */}
                    <View className="flex-1">
                      <Text weight="bold" numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text variant="caption" color="muted">
                        占比 {formatPercentage(percent)}
                      </Text>
                    </View>
                  </View>

                  {/* Value */}
                  <Text weight="bold">{displayValue(item.value)}</Text>
                </View>
              </Card>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}
