import { useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from "react-native";
import PagerView from "react-native-pager-view";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
  type SharedValue,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { SafeAreaView } from "react-native-safe-area-context";

// Dashboard 组件
import {
  SnapOverview,
  SnapPieChart,
  SnapTrendChart,
  AssetList,
} from "@/components/dashboard";

// 页面组件
import { HistoryScreen } from "@/components/history";
import { CompareScreen } from "@/components/compare";

// Snap Flow 和 Settings
import { useSnapWizard, useCreateAssetForm } from "@/components/snap-flow";
import { useSettingsSheet } from "@/components/settings";

import { useSnapshots } from "@/hooks/useSnapshots";
import { useAssets } from "@/hooks/useAssets";

import type { DashboardData, ChartData, TrendDataPoint } from "@/types/dashboard";

// Dashboard 页面组件
function DashboardScreen() {
  const { latestSnapshot, trendData, isLoading } = useSnapshots();
  const { activeAssets } = useAssets();

  // 从最新快照构建 pieChartData
  const pieChartData: ChartData[] = latestSnapshot
    ? latestSnapshot.items
      .filter((item) => item.valueInBase > 0)
      .map((item) => ({
        name: item.assetName,
        value: item.valueInBase,
        category: item.category as ChartData["category"],
      }))
    : [];

  const dashboardData: DashboardData | null = latestSnapshot
    ? {
      netWorth: latestSnapshot.netWorth,
      assets: latestSnapshot.totalAssets,
      liabilities: latestSnapshot.totalLiabilities,
      trend: trendData,
      snapshots: [],
      pieChartData,
      currency: latestSnapshot.currency,
    }
    : null;

  if (!dashboardData) {
    return (
      <SafeAreaView edges={["bottom"]} className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-5xl mb-6">{"📊"}</Text>
          <Text className="text-xl font-bold text-foreground mb-2">
            {"还没有快照数据"}
          </Text>
          <Text className="text-base text-muted-foreground text-center leading-6">
            {"点击右下角 + 按钮\n创建你的第一个资产快照"}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["bottom"]} className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-24"
        showsVerticalScrollIndicator={false}
      >
        {/* 净资产总览 */}
        <SnapOverview data={dashboardData} className="mb-6" />

        {/* 资产配置饼图 */}
        {pieChartData.length > 0 && (
          <View className="mb-6">
            <Text className="text-lg font-bold text-foreground mb-4">
              资产配置
            </Text>
            <SnapPieChart data={pieChartData} />
          </View>
        )}

        {/* 净资产趋势图 */}
        {trendData.length > 1 && (
          <View className="mb-6">
            <Text className="text-lg font-bold text-foreground mb-4">
              净资产趋势
            </Text>
            <SnapTrendChart data={trendData} currency={dashboardData.currency} />
          </View>
        )}

        {/* 资产明细列表 */}
        {pieChartData.length > 0 && <AssetList data={pieChartData} />}
      </ScrollView>
    </SafeAreaView>
  );
}

const PAGES = [
  { key: "history", title: "历史", Component: HistoryScreen },
  { key: "dashboard", title: "看板", Component: DashboardScreen },
  { key: "compare", title: "对比", Component: CompareScreen },
];

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * 三屏看板主页面
 * 使用 PagerView 实现左右手势滑动切换
 */
export default function TabsIndex() {
  const pagerRef = useRef<PagerView>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const scrollOffset = useSharedValue(1);

  // Snap Flow hooks
  const snapWizard = useSnapWizard();
  const createAssetForm = useCreateAssetForm();
  const settingsSheet = useSettingsSheet();

  const onPageSelected = useCallback(
    (e: { nativeEvent: { position: number } }) => {
      const position = e.nativeEvent.position;
      setCurrentPage(position);
      scrollOffset.value = position;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    []
  );

  const onPageScroll = useCallback(
    (e: { nativeEvent: { position: number; offset: number } }) => {
      const { position, offset } = e.nativeEvent;
      scrollOffset.value = position + offset;
    },
    []
  );

  const goToPage = useCallback((index: number) => {
    pagerRef.current?.setPage(index);
  }, []);

  const handleFabPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    snapWizard.open();
  };

  const handleSettingsPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    settingsSheet.open();
  };

  return (
    <View className="flex-1 bg-background">
      {/* 页面指示器 */}
      <SafeAreaView edges={["top"]} className="bg-background">
        <View className="pb-2 px-6">
          <View className="flex-row justify-center items-center gap-8">
            {PAGES.map((page, index) => (
              <PageIndicator
                key={page.key}
                title={page.title}
                index={index}
                currentPage={currentPage}
                scrollOffset={scrollOffset}
                onPress={() => goToPage(index)}
              />
            ))}
          </View>
        </View>
      </SafeAreaView>

      {/* PagerView 三屏滑动 */}
      <PagerView
        ref={pagerRef}
        style={styles.pagerView}
        initialPage={1}
        onPageSelected={onPageSelected}
        onPageScroll={onPageScroll}
        overdrag
      >
        {PAGES.map((page) => (
          <View key={page.key} style={styles.page}>
            <page.Component />
          </View>
        ))}
      </PagerView>

      {/* 底部 FAB 区域 */}
      <View className="absolute bottom-8 left-6 right-6 flex-row justify-between items-center">
        {/* 左侧：设置按钮 */}
        <Pressable
          className="w-12 h-12 rounded-full bg-card border border-border items-center justify-center shadow-lg active:scale-95"
          onPress={handleSettingsPress}
        >
          <Text className="text-xl">{"⚙️"}</Text>
        </Pressable>

        {/* 右侧：新建快照按钮 */}
        <Pressable
          className="w-14 h-14 rounded-full bg-primary items-center justify-center shadow-lg active:scale-95"
          onPress={handleFabPress}
        >
          <Text className="text-primary-foreground text-2xl font-light">+</Text>
        </Pressable>
      </View>

      {/* Sheets */}
      {snapWizard.Wizard}
      {createAssetForm.Form}
      {settingsSheet.Sheet}
    </View>
  );
}

/**
 * 页面指示器组件
 */
function PageIndicator({
  title,
  index,
  currentPage,
  scrollOffset,
  onPress,
}: {
  title: string;
  index: number;
  currentPage: number;
  scrollOffset: SharedValue<number>;
  onPress: () => void;
}) {
  const isActive = currentPage === index;

  const animatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      scrollOffset.value,
      [index - 1, index, index + 1],
      [0.9, 1, 0.9],
      "clamp"
    );
    const opacity = interpolate(
      scrollOffset.value,
      [index - 1, index, index + 1],
      [0.5, 1, 0.5],
      "clamp"
    );

    return {
      transform: [{ scale: withSpring(scale, { damping: 20 }) }],
      opacity: withSpring(opacity, { damping: 20 }),
    };
  });

  return (
    <AnimatedPressable onPress={onPress} style={animatedStyle}>
      <Text
        className={`text-base font-semibold ${isActive ? "text-foreground" : "text-muted-foreground"
          }`}
      >
        {title}
      </Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  pagerView: {
    flex: 1,
  },
  page: {
    flex: 1,
  },
});
