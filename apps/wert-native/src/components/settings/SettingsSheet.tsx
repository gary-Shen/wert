import { useState, useRef, useCallback } from "react";
import { View, ScrollView, Pressable, useColorScheme, Switch, Alert } from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  Layout,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Sheet, type SheetRef } from "@/components/ui/sheet";
import { showToast } from "@/components/ui/toast";
import { useUserStore } from "@/stores/userStore";
import { useAssets } from "@/hooks/useAssets";
import { getCategoryColor, hslToRgba } from "@/lib/colors";
import type { AssetCategory } from "@/db/schema";
import type { AssetAccount } from "@/stores/assetsStore";
import { AssetEditSheet } from "./AssetEditSheet";

// 货币选项
const CURRENCIES = [
  { value: "CNY", label: "人民币 (CNY)", flag: "🇨🇳" },
  { value: "USD", label: "美元 (USD)", flag: "🇺🇸" },
  { value: "HKD", label: "港币 (HKD)", flag: "🇭🇰" },
  { value: "EUR", label: "欧元 (EUR)", flag: "🇪🇺" },
  { value: "JPY", label: "日元 (JPY)", flag: "🇯🇵" },
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

// Tab 类型
type SettingsTab = "account" | "assets";

interface SettingsSheetProps {
  onClose: () => void;
}

/**
 * Settings 设置面板
 * 使用 Bottom Sheet 展示，包含账户和资产两个 Tab
 */
export function SettingsSheet({ onClose }: SettingsSheetProps) {
  const sheetRef = useRef<SheetRef>(null);
  const [activeTab, setActiveTab] = useState<SettingsTab>("account");
  const colorScheme = useColorScheme();

  const {
    baseCurrency,
    setBaseCurrency,
    reset: resetStore,
  } = useUserStore();

  const handleCurrencyChange = (currency: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setBaseCurrency(currency);
    showToast.success("基准货币已更新");
  };

  const handleReset = () => {
    Alert.alert(
      "重置设置",
      "确定要重置所有设置吗？此操作不会删除你的资产数据。",
      [
        { text: "取消", style: "cancel" },
        {
          text: "重置",
          style: "destructive",
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            resetStore();
            showToast.info("设置已重置");
          },
        },
      ]
    );
  };

  return (
    <Sheet
      ref={sheetRef}
      snapPoints={["60%", "90%"]}
      title="设置"
      onClose={onClose}
    >
      <View className="flex-1">
        {/* Tab 切换 */}
        <View className="flex-row mx-4 mb-4 bg-muted rounded-xl p-1">
          <TabButton
            label="👤 账户"
            isActive={activeTab === "account"}
            onPress={() => setActiveTab("account")}
          />
          <TabButton
            label="💰 资产"
            isActive={activeTab === "assets"}
            onPress={() => setActiveTab("assets")}
          />
        </View>

        <ScrollView
          className="flex-1"
          contentContainerClassName="px-4 pb-8"
          showsVerticalScrollIndicator={false}
        >
          {activeTab === "account" && (
            <AccountSettings
              baseCurrency={baseCurrency}
              onCurrencyChange={handleCurrencyChange}
              colorScheme={colorScheme}
              onReset={handleReset}
            />
          )}

          {activeTab === "assets" && <AssetSettings />}
        </ScrollView>
      </View>
    </Sheet>
  );
}

/**
 * Tab 按钮
 */
function TabButton({
  label,
  isActive,
  onPress,
}: {
  label: string;
  isActive: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-1 py-2.5 rounded-lg items-center ${isActive ? "bg-background shadow-sm" : ""
        }`}
    >
      <Text weight={isActive ? "bold" : "medium"}>{label}</Text>
    </Pressable>
  );
}

/**
 * 账户设置 Tab
 */
function AccountSettings({
  baseCurrency,
  onCurrencyChange,
  colorScheme,
  onReset,
}: {
  baseCurrency: string;
  onCurrencyChange: (currency: string) => void;
  colorScheme: "light" | "dark" | null | undefined;
  onReset: () => void;
}) {
  return (
    <Animated.View entering={FadeIn} layout={Layout.springify()}>
      {/* 用户信息 */}
      <Card variant="outline" className="p-4 mb-6">
        <View className="flex-row items-center gap-4">
          <View className="w-14 h-14 rounded-full bg-primary/10 items-center justify-center">
            <Text className="text-2xl">👤</Text>
          </View>
          <View className="flex-1">
            <Text weight="bold" variant="title">
              本地用户
            </Text>
            <Text variant="caption" color="muted">
              离线模式 · 数据存储在设备
            </Text>
          </View>
        </View>
      </Card>

      {/* 基准货币 */}
      <View className="mb-6">
        <Text variant="label" color="muted" className="mb-3">
          基准货币
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {CURRENCIES.map((curr) => {
            const isSelected = baseCurrency === curr.value;
            return (
              <Pressable
                key={curr.value}
                onPress={() => onCurrencyChange(curr.value)}
                className={`px-4 py-3 rounded-xl flex-row items-center gap-2 ${isSelected ? "bg-primary" : "bg-muted border border-border"
                  }`}
              >
                <Text>{curr.flag}</Text>
                <Text
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

      {/* 主题 */}
      <View className="mb-6">
        <Text variant="label" color="muted" className="mb-3">
          主题
        </Text>
        <Card variant="outline" className="p-4">
          <View className="flex-row justify-between items-center">
            <View className="flex-row items-center gap-3">
              <Text className="text-xl">
                {colorScheme === "dark" ? "🌙" : "☀️"}
              </Text>
              <View>
                <Text weight="medium">
                  {colorScheme === "dark" ? "深色模式" : "浅色模式"}
                </Text>
                <Text variant="caption" color="muted">
                  跟随系统设置
                </Text>
              </View>
            </View>
            <Switch
              value={colorScheme === "dark"}
              disabled
              trackColor={{ false: "#e5e5e5", true: "#22c55e" }}
            />
          </View>
        </Card>
      </View>

      {/* 关于 */}
      <View className="mb-6">
        <Text variant="label" color="muted" className="mb-3">
          关于
        </Text>
        <Card variant="outline" className="p-4">
          <View className="flex-row justify-between items-center mb-2">
            <Text color="muted">版本</Text>
            <Text weight="medium">1.0.0</Text>
          </View>
          <View className="flex-row justify-between items-center">
            <Text color="muted">数据存储</Text>
            <Text weight="medium">本地 SQLite</Text>
          </View>
        </Card>
      </View>

      {/* 重置 */}
      <Button variant="outline" onPress={onReset}>
        重置设置
      </Button>
    </Animated.View>
  );
}

/**
 * 资产设置 Tab
 */
function AssetSettings() {
  const { assets, activeAssets, isLoading, createAsset, updateAsset, deleteAsset, toggleAssetActive } = useAssets();
  const [isCreating, setIsCreating] = useState(false);
  const [editingAsset, setEditingAsset] = useState<AssetAccount | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  // 新建资产表单状态
  const [newAssetName, setNewAssetName] = useState("");
  const [newAssetCategory, setNewAssetCategory] = useState<AssetCategory>("CASH");
  const [newAssetCurrency, setNewAssetCurrency] = useState("CNY");

  const handleCreateAsset = async () => {
    if (!newAssetName.trim()) {
      showToast.error("请输入资产名称");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await createAsset({
        name: newAssetName.trim(),
        category: newAssetCategory,
        currency: newAssetCurrency,
      });

      // 重置表单
      setNewAssetName("");
      setNewAssetCategory("CASH");
      setNewAssetCurrency("CNY");
      setIsCreating(false);
    } catch (error) {
      // Error already handled in hook
    }
  };

  const handleDeleteAsset = (asset: AssetAccount) => {
    Alert.alert(
      "删除资产",
      `确定要删除「${asset.name}」吗？此操作无法撤销。`,
      [
        { text: "取消", style: "cancel" },
        {
          text: "删除",
          style: "destructive",
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await deleteAsset(asset.id);
          },
        },
      ]
    );
  };

  const handleToggleActive = async (asset: AssetAccount) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await toggleAssetActive(asset.id);
    showToast.success(asset.isActive ? "资产已归档" : "资产已激活");
  };

  const displayAssets = showInactive ? assets : activeAssets;

  return (
    <Animated.View entering={FadeIn} layout={Layout.springify()}>
      {/* 头部操作区 */}
      <View className="flex-row justify-between items-center mb-4">
        <View>
          <Text variant="title" weight="bold">
            资产账户
          </Text>
          <Text variant="caption" color="muted">
            {activeAssets.length} 个活跃 · {assets.length - activeAssets.length} 个已归档
          </Text>
        </View>
        <Button
          size="sm"
          onPress={() => setIsCreating(true)}
          disabled={isCreating}
        >
          + 新建
        </Button>
      </View>

      {/* 显示归档开关 */}
      <View className="flex-row justify-between items-center mb-4 px-1">
        <Text variant="caption" color="muted">
          显示已归档资产
        </Text>
        <Switch
          value={showInactive}
          onValueChange={setShowInactive}
          trackColor={{ false: "#e5e5e5", true: "#22c55e" }}
        />
      </View>

      {/* 新建资产表单 */}
      {isCreating && (
        <Animated.View entering={FadeInDown} className="mb-4">
          <Card variant="outline" className="p-4">
            <Text weight="bold" className="mb-3">
              新建资产
            </Text>

            {/* 资产名称 */}
            <Input
              placeholder="资产名称"
              value={newAssetName}
              onChangeText={setNewAssetName}
              className="mb-3"
            />

            {/* 类别选择 */}
            <Text variant="caption" color="muted" className="mb-2">
              类别
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mb-3"
              contentContainerClassName="gap-2"
            >
              {ASSET_CATEGORIES.map((cat) => {
                const isSelected = newAssetCategory === cat.value;
                const color = getCategoryColor(cat.value);
                return (
                  <Pressable
                    key={cat.value}
                    onPress={() => setNewAssetCategory(cat.value)}
                    className={`px-3 py-2 rounded-lg flex-row items-center gap-1 ${isSelected ? "border-2 border-primary" : "border border-border"
                      }`}
                    style={
                      isSelected
                        ? { backgroundColor: hslToRgba(color, 0.1) }
                        : undefined
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

            {/* 货币选择 */}
            <Text variant="caption" color="muted" className="mb-2">
              货币
            </Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              {CURRENCIES.slice(0, 3).map((curr) => {
                const isSelected = newAssetCurrency === curr.value;
                return (
                  <Pressable
                    key={curr.value}
                    onPress={() => setNewAssetCurrency(curr.value)}
                    className={`px-3 py-2 rounded-lg flex-row items-center gap-1 ${isSelected ? "bg-primary" : "bg-muted"
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

            {/* 操作按钮 */}
            <View className="flex-row gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onPress={() => setIsCreating(false)}
              >
                取消
              </Button>
              <Button className="flex-1" onPress={handleCreateAsset}>
                创建
              </Button>
            </View>
          </Card>
        </Animated.View>
      )}

      {/* 资产列表 */}
      {displayAssets.length === 0 ? (
        <View className="items-center py-12">
          <Text className="text-4xl mb-4">📦</Text>
          <Text weight="bold" className="mb-2">
            暂无资产
          </Text>
          <Text variant="caption" color="muted" className="text-center">
            点击「新建」添加你的第一个资产账户
          </Text>
        </View>
      ) : (
        <View className="gap-3">
          {displayAssets.map((asset, index) => {
            const category = ASSET_CATEGORIES.find((c) => c.value === asset.category);
            const color = getCategoryColor(asset.category);

            return (
              <Animated.View
                key={asset.id}
                entering={FadeInDown.delay(index * 30)}
                layout={Layout.springify()}
              >
                <Card
                  variant="outline"
                  className={`p-4 ${!asset.isActive ? "opacity-60" : ""}`}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-3 flex-1">
                      <View
                        className="w-10 h-10 rounded-xl items-center justify-center"
                        style={{ backgroundColor: hslToRgba(color, 0.15) }}
                      >
                        <Text>{category?.icon || "📦"}</Text>
                      </View>
                      <View className="flex-1">
                        <Text weight="medium" numberOfLines={1}>
                          {asset.name}
                        </Text>
                        <Text variant="caption" color="muted">
                          {category?.label} · {asset.currency}
                          {!asset.isActive && " · 已归档"}
                        </Text>
                      </View>
                    </View>

                    {/* 操作按钮 */}
                    <View className="flex-row gap-2">
                      <Pressable
                        onPress={() => setEditingAsset(asset)}
                        className="w-8 h-8 rounded-full bg-muted items-center justify-center"
                      >
                        <Text className="text-sm">✏️</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => handleToggleActive(asset)}
                        className="w-8 h-8 rounded-full bg-muted items-center justify-center"
                      >
                        <Text className="text-sm">
                          {asset.isActive ? "📥" : "📤"}
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => handleDeleteAsset(asset)}
                        className="w-8 h-8 rounded-full bg-destructive/10 items-center justify-center"
                      >
                        <Text className="text-sm">🗑️</Text>
                      </Pressable>
                    </View>
                  </View>
                </Card>
              </Animated.View>
            );
          })}
        </View>
      )}

      {/* 编辑资产 Sheet */}
      {editingAsset && (
        <AssetEditSheet
          asset={editingAsset}
          onClose={() => setEditingAsset(null)}
        />
      )}
    </Animated.View>
  );
}

/**
 * Hook 方式使用
 */
export function useSettingsSheet() {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  return {
    isOpen,
    open,
    close,
    Sheet: isOpen ? <SettingsSheet onClose={close} /> : null,
  };
}
