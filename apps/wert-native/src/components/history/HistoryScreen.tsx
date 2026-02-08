import { useCallback, useMemo, useState } from "react";
import { View, ScrollView, Pressable, RefreshControl } from "react-native";
import Animated, { FadeInDown, Layout } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "@/components/ui/text";
import { Card } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useSnapshots } from "@/hooks/useSnapshots";
import type { Snapshot } from "@/stores/snapshotsStore";

interface HistoryScreenProps {
  onSelectSnapshot?: (snapshot: Snapshot) => void;
}

/**
 * 历史快照页面
 */
export function HistoryScreen({ onSelectSnapshot }: HistoryScreenProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { snapshots, loadSnapshots } = useSnapshots();

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadSnapshots();
    setIsRefreshing(false);
  }, [loadSnapshots]);

  const handleSelectSnapshot = useCallback(
    (snapshot: Snapshot) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onSelectSnapshot?.(snapshot);
    },
    [onSelectSnapshot]
  );

  // 按月份分组
  const groupedSnapshots = useMemo(() => {
    const groups: Record<string, Snapshot[]> = {};

    snapshots.forEach((snap) => {
      const monthKey = snap.date.substring(0, 7); // "YYYY-MM"
      if (!groups[monthKey]) {
        groups[monthKey] = [];
      }
      groups[monthKey].push(snap);
    });

    return Object.entries(groups)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([month, items]) => ({
        month,
        label: formatMonthLabel(month),
        items: items.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        ),
      }));
  }, [snapshots]);

  return (
    <SafeAreaView edges={["bottom"]} className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-24"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#888"
          />
        }
      >
        {/* 标题 */}
        <View className="my-6">
          <Text variant="headline" weight="bold">
            历史快照
          </Text>
          <Text variant="caption" color="muted" className="mt-1">
            共 {snapshots.length} 条记录
          </Text>
        </View>

        {/* 快照列表 */}
        {groupedSnapshots.map((group, groupIndex) => (
          <View key={group.month} className="mb-6">
            {/* 月份标题 */}
            <Text variant="label" color="muted" className="mb-3 ml-1">
              {group.label}
            </Text>

            {/* 该月快照 */}
            <View className="gap-3">
              {group.items.map((snapshot, index) => (
                <SnapshotCard
                  key={snapshot.id}
                  snapshot={snapshot}
                  index={groupIndex * 10 + index}
                  previousSnapshot={group.items[index + 1]}
                  onPress={() => handleSelectSnapshot(snapshot)}
                />
              ))}
            </View>
          </View>
        ))}

        {snapshots.length === 0 && (
          <View className="items-center py-16">
            <Text className="text-4xl mb-4">{"📊"}</Text>
            <Text weight="bold" className="mb-2">
              暂无快照记录
            </Text>
            <Text variant="caption" color="muted" className="text-center">
              {"点击右下角 + 按钮\n创建你的第一个资产快照"}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * 快照卡片
 */
function SnapshotCard({
  snapshot,
  index,
  previousSnapshot,
  onPress,
}: {
  snapshot: Snapshot;
  index: number;
  previousSnapshot?: Snapshot;
  onPress: () => void;
}) {
  // 计算变化
  const change = previousSnapshot
    ? snapshot.netWorth - previousSnapshot.netWorth
    : 0;
  const changePercent = previousSnapshot
    ? ((change / previousSnapshot.netWorth) * 100).toFixed(1)
    : null;
  const isPositive = change >= 0;

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 30).springify()}
      layout={Layout.springify()}
    >
      <Pressable onPress={onPress}>
        <Card variant="outline" className="p-4 active:scale-[0.98]">
          <View className="flex-row justify-between items-start">
            <View className="flex-1">
              {/* 日期 */}
              <View className="flex-row items-center gap-2">
                <Text weight="bold">{formatDate(snapshot.date)}</Text>
                {snapshot.note && (
                  <View className="bg-primary/10 px-2 py-0.5 rounded-full">
                    <Text variant="caption" className="text-primary">
                      {snapshot.note}
                    </Text>
                  </View>
                )}
              </View>

              {/* 净资产 */}
              <Text variant="title" weight="bold" className="mt-2">
                {formatCurrency(snapshot.netWorth)}
              </Text>

              {/* 资产/负债 */}
              <Text variant="caption" color="muted" className="mt-1">
                资产 {formatCurrency(snapshot.totalAssets)} · 负债{" "}
                {formatCurrency(snapshot.totalLiabilities)}
              </Text>
            </View>

            {/* 变化指示 */}
            {changePercent && (
              <View
                className={`px-3 py-1.5 rounded-full ${isPositive ? "bg-green-500/10" : "bg-red-500/10"
                  }`}
              >
                <Text
                  variant="caption"
                  weight="bold"
                  className={isPositive ? "text-green-500" : "text-red-500"}
                >
                  {isPositive ? "↑" : "↓"} {Math.abs(Number(changePercent))}%
                </Text>
              </View>
            )}
          </View>
        </Card>
      </Pressable>
    </Animated.View>
  );
}

/**
 * 格式化月份标签
 */
function formatMonthLabel(month: string): string {
  const [year, m] = month.split("-");
  const monthNames = [
    "一月",
    "二月",
    "三月",
    "四月",
    "五月",
    "六月",
    "七月",
    "八月",
    "九月",
    "十月",
    "十一月",
    "十二月",
  ];
  return `${year}年 ${monthNames[parseInt(m, 10) - 1]}`;
}
