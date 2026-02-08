import { useState, useRef, useCallback } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Text } from "@/components/ui/text";
import { Sheet, type SheetRef } from "@/components/ui/sheet";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ActionMenuItemProps {
  icon: string;
  label: string;
  description: string;
  onPress: () => void;
  highlighted?: boolean;
}

function ActionMenuItem({
  icon,
  label,
  description,
  onPress,
  highlighted = false,
}: ActionMenuItemProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      style={animatedStyle}
      className="flex-row items-center gap-4 p-4 rounded-2xl active:bg-accent"
      onPressIn={() => {
        scale.value = withSpring(0.97, { damping: 20 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 20 });
      }}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
    >
      <View
        className={`w-12 h-12 rounded-full items-center justify-center ${highlighted ? "bg-primary" : "bg-muted"
          }`}
      >
        <Text className={`text-xl ${highlighted ? "text-primary-foreground" : ""}`}>
          {icon}
        </Text>
      </View>
      <View className="flex-1">
        <Text weight={highlighted ? "bold" : "semibold"}>{label}</Text>
        <Text variant="caption" color="muted">
          {description}
        </Text>
      </View>
    </AnimatedPressable>
  );
}

interface SnapActionSheetProps {
  onCreateSnapshot: () => void;
  onCreateAsset: () => void;
}

/**
 * Snap 操作菜单 Sheet
 * 显示创建快照和创建资产两个选项
 */
export function SnapActionSheet({
  onCreateSnapshot,
  onCreateAsset,
}: SnapActionSheetProps) {
  const sheetRef = useRef<SheetRef>(null);

  const open = useCallback(() => {
    sheetRef.current?.open();
  }, []);

  const close = useCallback(() => {
    sheetRef.current?.close();
  }, []);

  return {
    sheetRef,
    open,
    close,
    Sheet: (
      <Sheet
        ref={sheetRef}
        snapPoints={["35%"]}
        title="创建新记录"
      >
        <View className="px-4 py-2">
          <ActionMenuItem
            icon="📸"
            label="创建快照"
            description="记录当前资产状态"
            highlighted
            onPress={() => {
              close();
              setTimeout(onCreateSnapshot, 300);
            }}
          />
          <ActionMenuItem
            icon="💰"
            label="创建资产"
            description="添加新的资产账户"
            onPress={() => {
              close();
              setTimeout(onCreateAsset, 300);
            }}
          />
        </View>
      </Sheet>
    ),
  };
}

/**
 * 使用 Hook 方式导出
 */
export function useSnapActionSheet(props: SnapActionSheetProps) {
  return SnapActionSheet(props);
}
