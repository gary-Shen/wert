import { useState, useRef, useEffect } from "react";
import { View, ScrollView, TextInput } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Sheet, type SheetRef } from "@/components/ui/sheet";
import { showToast } from "@/components/ui/toast";
import { formatCurrency } from "@/lib/utils";
import { getCategoryColor, hslToRgba } from "@/lib/colors";
import { useSnapshots } from "@/hooks/useSnapshots";
import type { Snapshot, SnapshotItem } from "@/stores/snapshotsStore";

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

interface EditableItem {
  id: string;
  assetAccountId: string;
  assetName: string;
  category: string;
  currency: string;
  value: number;
  quantity: number | null;
  price: number | null;
  exchangeRate: number;
}

interface SnapshotEditSheetProps {
  snapshot: Snapshot;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * 快照编辑 Bottom Sheet
 */
export function SnapshotEditSheet({
  snapshot,
  onClose,
  onSaved,
}: SnapshotEditSheetProps) {
  const sheetRef = useRef<SheetRef>(null);
  const { updateSnapshot } = useSnapshots();
  const [isSaving, setIsSaving] = useState(false);

  const [editDate, setEditDate] = useState(snapshot.date);
  const [editNote, setEditNote] = useState(snapshot.note || "");
  const [editItems, setEditItems] = useState<EditableItem[]>(() =>
    snapshot.items.map((item) => ({
      id: item.id,
      assetAccountId: item.assetAccountId,
      assetName: item.assetName,
      category: item.category,
      currency: item.currency,
      value: item.value,
      quantity: item.quantity ?? null,
      price: item.price ?? null,
      exchangeRate: item.exchangeRate,
    }))
  );

  const updateItemValue = (index: number, value: number) => {
    setEditItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, value } : item))
    );
  };

  const updateItemQuantity = (index: number, quantity: number) => {
    setEditItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const price = item.price || 0;
        return { ...item, quantity, value: quantity * price };
      })
    );
  };

  const updateItemPrice = (index: number, price: number) => {
    setEditItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const qty = item.quantity || 0;
        return { ...item, price, value: qty * price };
      })
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await updateSnapshot(snapshot.id, {
        date: editDate,
        note: editNote || null,
        items: editItems.map((item) => ({
          assetAccountId: item.assetAccountId,
          value: item.value,
          quantity: item.quantity,
          price: item.price,
          exchangeRate: item.exchangeRate,
          valueInBase: item.value * item.exchangeRate,
        })),
      });
      onSaved();
    } catch {
      showToast.error("保存失败");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sheet
      ref={sheetRef}
      snapPoints={["60%", "90%"]}
      title="编辑快照"
      onClose={onClose}
    >
      <View className="flex-1">
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-4 pb-24"
          showsVerticalScrollIndicator={false}
        >
          {/* 日期 */}
          <View className="flex-row items-center gap-4 mb-4">
            <Text weight="medium">日期</Text>
            <View className="flex-1">
              <Input
                value={editDate}
                onChangeText={setEditDate}
                placeholder="YYYY-MM-DD"
              />
            </View>
          </View>

          {/* 备注 */}
          <View className="mb-6">
            <Text variant="label" color="muted" className="mb-2">
              备注
            </Text>
            <Input
              value={editNote}
              onChangeText={setEditNote}
              placeholder="快照备注..."
              multiline
              numberOfLines={2}
            />
          </View>

          {/* 编辑各项 */}
          <Text variant="label" color="muted" className="mb-3 ml-1">
            资产明细
          </Text>

          <View className="gap-3">
            {editItems.map((item, index) => (
              <Animated.View
                key={item.id}
                entering={FadeInDown.delay(index * 30).springify()}
              >
                <EditableItemCard
                  item={item}
                  onValueChange={(val) => updateItemValue(index, val)}
                  onQuantityChange={(val) => updateItemQuantity(index, val)}
                  onPriceChange={(val) => updateItemPrice(index, val)}
                />
              </Animated.View>
            ))}
          </View>
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

/**
 * 可编辑项卡片
 */
function EditableItemCard({
  item,
  onValueChange,
  onQuantityChange,
  onPriceChange,
}: {
  item: EditableItem;
  onValueChange: (val: number) => void;
  onQuantityChange: (val: number) => void;
  onPriceChange: (val: number) => void;
}) {
  const bgColor = hslToRgba(getCategoryColor(item.category), 0.1);
  const isInvestment = item.quantity != null && item.price != null;

  return (
    <Card variant="outline" className="p-4">
      <View className="flex-row items-center gap-3 mb-3">
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
          </Text>
        </View>
      </View>

      {isInvestment ? (
        <View className="gap-2">
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Text variant="caption" color="muted" className="mb-1">
                数量
              </Text>
              <TextInput
                className="h-10 px-3 rounded-lg border border-border text-foreground"
                keyboardType="numeric"
                value={String(item.quantity || "")}
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
                value={String(item.price || "")}
                onChangeText={(text) => {
                  const val = parseFloat(text);
                  if (!isNaN(val)) onPriceChange(val);
                }}
              />
            </View>
          </View>
          <Text variant="caption" color="muted" className="text-right">
            = {formatCurrency(item.value)} {item.currency}
          </Text>
        </View>
      ) : (
        <TextInput
          className="h-12 px-4 rounded-xl border border-border text-foreground text-lg"
          keyboardType="numeric"
          value={String(item.value)}
          onChangeText={(text) => {
            const val = parseFloat(text);
            if (!isNaN(val)) onValueChange(val);
          }}
        />
      )}
    </Card>
  );
}
