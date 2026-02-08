import { useState, useMemo, useCallback } from "react";
import { View, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeInDown, Layout } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Text } from "@/components/ui/text";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSnapshots } from "@/hooks/useSnapshots";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getCategoryColor, hslToRgba } from "@/lib/colors";
import type { Snapshot, SnapshotItem } from "@/stores/snapshotsStore";
import type { AssetCategory } from "@/db/schema";

// 对比类型
type CompareMode = "month" | "quarter" | "year" | "custom";

// 类别图标
const CATEGORY_ICONS: Record<string, string> = {
  CASH: "💵",
  BANK_DEPOSIT: "🏦",
  STOCK: "📈",
  FUND: "📊",
  BOND: "📜",
  CRYPTO: "₿",
  REAL_ESTATE: "🏠",
  VEHICLE: "🚗",
  INSURANCE: "🛡️",
  PRECIOUS_METAL: "🥇",
  OTHER: "📦",
  LIABILITY: "💳",
};

/**
 * 对比分析页面
 * 支持月度、季度、年度和自定义对比
 */
export function CompareScreen() {
  const { snapshots, isLoading } = useSnapshots();
  const [compareMode, setCompareMode] = useState<CompareMode | null>(null);
  const [selectedSnapshots, setSelectedSnapshots] = useState<[Snapshot | null, Snapshot | null]>([null, null]);

  // 获取对比快照（基于模式）
  const { baseSnapshot, compareSnapshot } = useMemo(() => {
    if (snapshots.length < 2) {
      return { baseSnapshot: snapshots[0] || null, compareSnapshot: null };
    }

    if (selectedSnapshots[0] && selectedSnapshots[1]) {
      return { baseSnapshot: selectedSnapshots[1], compareSnapshot: selectedSnapshots[0] };
    }

    const now = new Date();
    const latest = snapshots[0];

    switch (compareMode) {
      case "month": {
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prevSnapshot = snapshots.find((s) => {
          const d = new Date(s.date);
          return d.getMonth() === lastMonth.getMonth() && d.getFullYear() === lastMonth.getFullYear();
        });
        return { baseSnapshot: prevSnapshot || snapshots[1], compareSnapshot: latest };
      }
      case "quarter": {
        const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 - 3, 1);
        const prevSnapshot = snapshots.find((s) => {
          const d = new Date(s.date);
          return d >= quarterStart && d < new Date(quarterStart.getFullYear(), quarterStart.getMonth() + 3, 1);
        });
        return { baseSnapshot: prevSnapshot || snapshots[Math.min(3, snapshots.length - 1)], compareSnapshot: latest };
      }
      case "year": {
        const lastYear = now.getFullYear() - 1;
        const prevSnapshot = snapshots.find((s) => new Date(s.date).getFullYear() === lastYear);
        return { baseSnapshot: prevSnapshot || snapshots[snapshots.length - 1], compareSnapshot: latest };
      }
      default:
        return { baseSnapshot: snapshots[1], compareSnapshot: latest };
    }
  }, [snapshots, compareMode, selectedSnapshots]);

  // 计算变化
  const changes = useMemo(() => {
    if (!baseSnapshot || !compareSnapshot) return null;

    const netWorthChange = compareSnapshot.netWorth - baseSnapshot.netWorth;
    const netWorthChangePercent = baseSnapshot.netWorth ? (netWorthChange / baseSnapshot.netWorth) * 100 : 0;
    const assetsChange = compareSnapshot.totalAssets - baseSnapshot.totalAssets;
    const liabilitiesChange = compareSnapshot.totalLiabilities - baseSnapshot.totalLiabilities;

    // 按类别分组计算变化
    const categoryChanges = calculateCategoryChanges(baseSnapshot.items, compareSnapshot.items);

    return {
      netWorthChange,
      netWorthChangePercent,
      assetsChange,
      liabilitiesChange,
      categoryChanges,
    };
  }, [baseSnapshot, compareSnapshot]);

  const handleModeSelect = (mode: CompareMode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCompareMode(mode);
    setSelectedSnapshots([null, null]);
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCompareMode(null);
  };

  // 无数据状态
  if (snapshots.length < 2) {
    return (
      <SafeAreaView edges={["bottom"]} className="flex-1 bg-background">
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-4 pb-24 flex-1 justify-center"
          showsVerticalScrollIndicator={false}
        >
          <View className="items-center">
            <Text className="text-5xl mb-4">📊</Text>
            <Text variant="title" weight="bold" className="mb-2 text-center">
              需要更多数据
            </Text>
            <Text variant="body" color="muted" className="text-center">
              至少需要两个快照才能进行对比分析{"\n"}
              请先创建更多资产快照
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // 选择对比模式
  if (!compareMode) {
    return (
      <SafeAreaView edges={["bottom"]} className="flex-1 bg-background">
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-4 pb-24"
          showsVerticalScrollIndicator={false}
        >
          <View className="my-6">
            <Text variant="headline" weight="bold">
              对比分析
            </Text>
            <Text variant="caption" color="muted" className="mt-1">
              选择对比方式查看资产变化
            </Text>
          </View>

          {/* 快速对比选项 */}
          <View className="gap-3">
            <CompareOption
              title="月度对比"
              description="对比最新快照与上月数据"
              icon="📅"
              onPress={() => handleModeSelect("month")}
            />
            <CompareOption
              title="季度对比"
              description="对比本季度与上季度"
              icon="📈"
              onPress={() => handleModeSelect("quarter")}
            />
            <CompareOption
              title="年度对比"
              description="对比今年与去年同期"
              icon="🗓️"
              onPress={() => handleModeSelect("year")}
            />
            <CompareOption
              title="自定义对比"
              description="选择任意两个快照对比"
              icon="🔍"
              onPress={() => handleModeSelect("custom")}
            />
          </View>

          {/* 快照统计 */}
          <Card variant="filled" className="mt-6 p-4">
            <View className="flex-row justify-between items-center">
              <Text color="muted">可用快照</Text>
              <Text weight="bold">{snapshots.length} 个</Text>
            </View>
          </Card>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // 自定义选择模式
  if (compareMode === "custom" && (!selectedSnapshots[0] || !selectedSnapshots[1])) {
    return (
      <SafeAreaView edges={["bottom"]} className="flex-1 bg-background">
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-4 pb-24"
          showsVerticalScrollIndicator={false}
        >
          {/* 返回按钮 */}
          <Pressable onPress={handleBack} className="py-4">
            <Text color="primary" weight="medium">
              ← 返回
            </Text>
          </Pressable>

          <View className="mb-6">
            <Text variant="headline" weight="bold">
              选择快照
            </Text>
            <Text variant="caption" color="muted" className="mt-1">
              {!selectedSnapshots[0] ? "选择基准快照（较早的）" : "选择对比快照（较新的）"}
            </Text>
          </View>

          <View className="gap-3">
            {snapshots.map((snapshot, index) => {
              const isSelected = selectedSnapshots[0]?.id === snapshot.id;
              const isDisabled = selectedSnapshots[0]?.id === snapshot.id;

              return (
                <Animated.View key={snapshot.id} entering={FadeInDown.delay(index * 30)}>
                  <Pressable
                    onPress={() => {
                      if (isDisabled) return;
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      if (!selectedSnapshots[0]) {
                        setSelectedSnapshots([snapshot, null]);
                      } else {
                        setSelectedSnapshots([selectedSnapshots[0], snapshot]);
                      }
                    }}
                    disabled={isDisabled}
                  >
                    <Card
                      variant="outline"
                      className={`p-4 ${isSelected ? "border-primary bg-primary/5" : ""} ${isDisabled ? "opacity-50" : ""}`}
                    >
                      <View className="flex-row justify-between items-center">
                        <View>
                          <Text weight="bold">{formatDate(snapshot.date)}</Text>
                          <Text variant="caption" color="muted">
                            净资产 {formatCurrency(snapshot.netWorth)}
                          </Text>
                        </View>
                        {isSelected && <Text className="text-primary">✓ 基准</Text>}
                      </View>
                    </Card>
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // 对比结果视图
  return (
    <SafeAreaView edges={["bottom"]} className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-24"
        showsVerticalScrollIndicator={false}
      >
        {/* 返回按钮 */}
        <Pressable onPress={handleBack} className="py-4">
          <Text color="primary" weight="medium">
            ← 返回
          </Text>
        </Pressable>

        {/* 对比标题 */}
        <View className="mb-6">
          <Text variant="headline" weight="bold">
            {compareMode === "month" && "月度对比"}
            {compareMode === "quarter" && "季度对比"}
            {compareMode === "year" && "年度对比"}
            {compareMode === "custom" && "自定义对比"}
          </Text>
          <Text variant="caption" color="muted" className="mt-1">
            {baseSnapshot && formatDate(baseSnapshot.date)} → {compareSnapshot && formatDate(compareSnapshot.date)}
          </Text>
        </View>

        {changes && (
          <Animated.View entering={FadeIn} layout={Layout.springify()}>
            {/* 净资产变化总览 */}
            <Card variant="gradient" className="p-5 mb-4">
              <Text variant="caption" color="muted" className="mb-1">
                净资产变化
              </Text>
              <View className="flex-row items-baseline gap-2">
                <Text variant="display" weight="bold">
                  {changes.netWorthChange >= 0 ? "+" : ""}
                  {formatCurrency(changes.netWorthChange)}
                </Text>
                <View
                  className={`px-2 py-0.5 rounded-full ${changes.netWorthChange >= 0 ? "bg-green-500/20" : "bg-red-500/20"
                    }`}
                >
                  <Text
                    variant="caption"
                    weight="bold"
                    className={changes.netWorthChange >= 0 ? "text-green-500" : "text-red-500"}
                  >
                    {changes.netWorthChange >= 0 ? "↑" : "↓"} {Math.abs(changes.netWorthChangePercent).toFixed(1)}%
                  </Text>
                </View>
              </View>
            </Card>

            {/* 资产/负债变化 */}
            <View className="flex-row gap-3 mb-6">
              <Card variant="outline" className="flex-1 p-4">
                <Text variant="caption" color="muted">
                  资产变化
                </Text>
                <Text
                  variant="title"
                  weight="bold"
                  className={changes.assetsChange >= 0 ? "text-green-500" : "text-red-500"}
                >
                  {changes.assetsChange >= 0 ? "+" : ""}
                  {formatCurrency(changes.assetsChange)}
                </Text>
              </Card>
              <Card variant="outline" className="flex-1 p-4">
                <Text variant="caption" color="muted">
                  负债变化
                </Text>
                <Text
                  variant="title"
                  weight="bold"
                  className={changes.liabilitiesChange <= 0 ? "text-green-500" : "text-red-500"}
                >
                  {changes.liabilitiesChange >= 0 ? "+" : ""}
                  {formatCurrency(changes.liabilitiesChange)}
                </Text>
              </Card>
            </View>

            {/* 类别变化明细 */}
            <Text variant="label" color="muted" className="mb-3">
              类别变化明细
            </Text>
            <View className="gap-3">
              {changes.categoryChanges.map((item, index) => (
                <Animated.View key={item.category} entering={FadeInDown.delay(index * 50)}>
                  <CategoryChangeCard item={item} />
                </Animated.View>
              ))}
            </View>

            {/* 快照详情对比 */}
            <View className="mt-6">
              <Text variant="label" color="muted" className="mb-3">
                快照详情
              </Text>
              <View className="flex-row gap-3">
                <SnapshotMiniCard snapshot={baseSnapshot!} label="基准" />
                <SnapshotMiniCard snapshot={compareSnapshot!} label="最新" />
              </View>
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * 对比选项卡片
 */
function CompareOption({
  title,
  description,
  icon,
  onPress,
}: {
  title: string;
  description: string;
  icon: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress}>
      <Card variant="outline" className="p-4 active:scale-[0.98]">
        <View className="flex-row items-center gap-4">
          <View className="w-12 h-12 rounded-xl bg-primary/10 items-center justify-center">
            <Text className="text-xl">{icon}</Text>
          </View>
          <View className="flex-1">
            <Text weight="bold">{title}</Text>
            <Text variant="caption" color="muted">
              {description}
            </Text>
          </View>
          <Text color="muted" className="text-xl">
            ›
          </Text>
        </View>
      </Card>
    </Pressable>
  );
}

/**
 * 类别变化卡片
 */
function CategoryChangeCard({
  item,
}: {
  item: {
    category: string;
    name: string;
    baseValue: number;
    compareValue: number;
    change: number;
    changePercent: number;
  };
}) {
  const icon = CATEGORY_ICONS[item.category] || "📦";
  const isPositive = item.change >= 0;
  const color = getCategoryColor(item.category as AssetCategory);

  return (
    <Card variant="outline" className="p-4">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-3 flex-1">
          <View
            className="w-10 h-10 rounded-xl items-center justify-center"
            style={{ backgroundColor: hslToRgba(color, 0.15) }}
          >
            <Text>{icon}</Text>
          </View>
          <View className="flex-1">
            <Text weight="medium" numberOfLines={1}>
              {item.name}
            </Text>
            <Text variant="caption" color="muted">
              {formatCurrency(item.baseValue)} → {formatCurrency(item.compareValue)}
            </Text>
          </View>
        </View>
        <View className="items-end">
          <Text weight="bold" className={isPositive ? "text-green-500" : "text-red-500"}>
            {isPositive ? "+" : ""}
            {formatCurrency(item.change)}
          </Text>
          <Text variant="caption" className={isPositive ? "text-green-500" : "text-red-500"}>
            {isPositive ? "↑" : "↓"} {Math.abs(item.changePercent).toFixed(1)}%
          </Text>
        </View>
      </View>
    </Card>
  );
}

/**
 * 快照迷你卡片
 */
function SnapshotMiniCard({ snapshot, label }: { snapshot: Snapshot; label: string }) {
  return (
    <Card variant="filled" className="flex-1 p-3">
      <Text variant="caption" color="muted" className="mb-1">
        {label}
      </Text>
      <Text weight="bold">{formatDate(snapshot.date)}</Text>
      <Text variant="caption">{formatCurrency(snapshot.netWorth)}</Text>
    </Card>
  );
}

/**
 * 计算类别变化
 */
function calculateCategoryChanges(
  baseItems: SnapshotItem[],
  compareItems: SnapshotItem[]
): Array<{
  category: string;
  name: string;
  baseValue: number;
  compareValue: number;
  change: number;
  changePercent: number;
}> {
  const categoryMap = new Map<string, { base: number; compare: number; name: string }>();

  // 基准快照
  baseItems.forEach((item) => {
    const key = item.category;
    const existing = categoryMap.get(key) || { base: 0, compare: 0, name: getCategoryName(key) };
    existing.base += item.valueInBase;
    categoryMap.set(key, existing);
  });

  // 对比快照
  compareItems.forEach((item) => {
    const key = item.category;
    const existing = categoryMap.get(key) || { base: 0, compare: 0, name: getCategoryName(key) };
    existing.compare += item.valueInBase;
    categoryMap.set(key, existing);
  });

  return Array.from(categoryMap.entries())
    .map(([category, data]) => ({
      category,
      name: data.name,
      baseValue: data.base,
      compareValue: data.compare,
      change: data.compare - data.base,
      changePercent: data.base ? ((data.compare - data.base) / data.base) * 100 : 0,
    }))
    .filter((item) => item.baseValue !== 0 || item.compareValue !== 0)
    .sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
}

/**
 * 获取类别名称
 */
function getCategoryName(category: string): string {
  const names: Record<string, string> = {
    CASH: "现金",
    BANK_DEPOSIT: "银行存款",
    STOCK: "股票",
    FUND: "基金",
    BOND: "债券",
    CRYPTO: "加密货币",
    REAL_ESTATE: "房产",
    VEHICLE: "车辆",
    INSURANCE: "保险",
    PRECIOUS_METAL: "贵金属",
    OTHER: "其他",
    LIABILITY: "负债",
  };
  return names[category] || category;
}
