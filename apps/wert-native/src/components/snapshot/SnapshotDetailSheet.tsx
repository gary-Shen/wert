import { useState, useRef, useCallback } from "react";
import { View, ScrollView, Alert } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sheet, type SheetRef } from "@/components/ui/sheet";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getCategoryColor, hslToRgba } from "@/lib/colors";
import { useSnapshots } from "@/hooks/useSnapshots";
import type { Snapshot, SnapshotItem } from "@/stores/snapshotsStore";

// 类别图标
const CATEGORY_ICONS: Record<string, string> = {
  CASH: "💵",
  BANK_DEPOSIT: "🏦",
  STOCK: "📈",
  FUND: "📊",
  BOND: "📄",
  CRYPTO: "₿",
  REAL_ESTATE: "🏠",
  VEHICLE: "🚗",
  PRECIOUS_METAL: "🥇",
  COLLECTIBLE: "🎨",
  LIABILITY: "💳",
  INSURANCE: "🛡️",
  OTHER: "📦",
};

interface SnapshotDetailSheetProps {
  snapshot: Snapshot;
  onClose: () => void;
  onEdit: (snapshot: Snapshot) => void;
}

/**
 * 快照详情 Bottom Sheet
 */
export function SnapshotDetailSheet({
  snapshot,
  onClose,
  onEdit,
}: SnapshotDetailSheetProps) {
  const sheetRef = useRef<SheetRef>(null);
  const { deleteSnapshot } = useSnapshots();

  const handleDelete = () => {
    Alert.alert("删除快照", "确定要删除这条快照记录吗？此操作无法撤销。", [
      { text: "取消", style: "cancel" },
      {
        text: "删除",
        style: "destructive",
        onPress: async () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          await deleteSnapshot(snapshot.id);
          onClose();
        },
      },
    ]);
  };

  return (
    <Sheet
      ref={sheetRef}
      snapPoints={["60%", "90%"]}
      title="快照详情"
      onClose={onClose}
    >
      <View className="flex-1">
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-4 pb-24"
          showsVerticalScrollIndicator={false}
        >
          {/* 概览信息 */}
          <Card variant="outline" className="p-4 mb-4">
            <View className="flex-row justify-between items-center mb-3">
              <Text weight="medium" color="muted">
                日期
              </Text>
              <Text weight="bold">{formatDate(snapshot.date, "long")}</Text>
            </View>

            {snapshot.note && (
              <View className="flex-row justify-between items-center mb-3">
                <Text weight="medium" color="muted">
                  备注
                </Text>
                <Text weight="medium">{snapshot.note}</Text>
              </View>
            )}

            <View className="border-t border-border pt-3 mt-1">
              <View className="flex-row justify-between items-center mb-2">
                <Text color="muted">资产总额</Text>
                <Text weight="bold" className="text-green-500">
                  {formatCurrency(snapshot.totalAssets)}
                </Text>
              </View>
              <View className="flex-row justify-between items-center mb-2">
                <Text color="muted">负债总额</Text>
                <Text weight="bold" className="text-red-500">
                  {formatCurrency(snapshot.totalLiabilities)}
                </Text>
              </View>
              <View className="flex-row justify-between items-center">
                <Text weight="bold">净资产</Text>
                <Text variant="title" weight="bold">
                  {formatCurrency(snapshot.netWorth)}
                </Text>
              </View>
            </View>
          </Card>

          {/* 资产明细 */}
          <Text variant="label" color="muted" className="mb-3 ml-1">
            资产明细 ({snapshot.items.length})
          </Text>

          <View className="gap-2">
            {snapshot.items.map((item, index) => (
              <Animated.View
                key={item.id}
                entering={FadeInDown.delay(index * 30).springify()}
              >
                <SnapshotItemCard item={item} />
              </Animated.View>
            ))}
          </View>
        </ScrollView>

        {/* 底部操作 */}
        <View className="absolute bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
          <View className="flex-row gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onPress={handleDelete}
            >
              删除
            </Button>
            <Button className="flex-1" onPress={() => onEdit(snapshot)}>
              编辑
            </Button>
          </View>
        </View>
      </View>
    </Sheet>
  );
}

/**
 * 快照项卡片
 */
function SnapshotItemCard({ item }: { item: SnapshotItem }) {
  const bgColor = hslToRgba(getCategoryColor(item.category), 0.1);
  const isLiability = item.category === "LIABILITY";

  return (
    <Card variant="outline" className="p-3">
      <View className="flex-row items-center gap-3">
        <View
          className="w-9 h-9 rounded-lg items-center justify-center"
          style={{ backgroundColor: bgColor }}
        >
          <Text className="text-base">
            {CATEGORY_ICONS[item.category] || "📦"}
          </Text>
        </View>

        <View className="flex-1">
          <Text weight="medium" numberOfLines={1}>
            {item.assetName}
          </Text>
          <Text variant="caption" color="muted">
            {item.currency}
            {item.exchangeRate !== 1 && ` · 汇率 ${item.exchangeRate.toFixed(4)}`}
          </Text>
        </View>

        <View className="items-end">
          <Text
            weight="bold"
            className={isLiability ? "text-red-500" : ""}
          >
            {isLiability ? "-" : ""}
            {formatCurrency(item.value)}
          </Text>
          {item.exchangeRate !== 1 && (
            <Text variant="caption" color="muted">
              ={formatCurrency(item.valueInBase)} {" "}
            </Text>
          )}
          {item.quantity != null && item.price != null && (
            <Text variant="caption" color="muted">
              {item.quantity} x {formatCurrency(item.price)}
            </Text>
          )}
        </View>
      </View>
    </Card>
  );
}

/**
 * Hook 方式使用
 */
export function useSnapshotDetailSheet() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);

  const open = useCallback((snap: Snapshot) => setSnapshot(snap), []);
  const close = useCallback(() => setSnapshot(null), []);

  return {
    snapshot,
    isOpen: snapshot !== null,
    open,
    close,
  };
}
