import { useState } from "react";
import { View, Pressable } from "react-native";
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import { Text } from "@/components/ui/text";
import { Card } from "@/components/ui/card";
import type { DashboardData } from "@/types/dashboard";

// Icons as simple components (since we can't use lucide-react directly in RN)
function EyeIcon({ visible }: { visible: boolean }) {
  return (
    <Text className="text-white/70 text-sm">
      {visible ? "👁" : "🙈"}
    </Text>
  );
}

interface SnapOverviewProps {
  data: DashboardData;
  className?: string;
}

/**
 * 净资产总览组件
 * 显示净资产、资产、负债以及资产/负债比例条
 */
export function SnapOverview({ data, className }: SnapOverviewProps) {
  const [showAmount, setShowAmount] = useState(true);

  const netWorth = data.netWorth;
  const assetsVal = data.assets;
  const liabilitiesVal = Math.abs(data.liabilities);
  const totalVolume = assetsVal + liabilitiesVal;

  // Progress bar percentage (Assets / (Assets + Liabilities))
  const progressPercent = totalVolume > 0 ? (assetsVal / totalVolume) * 100 : 100;

  const togglePrivacy = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowAmount((prev) => !prev);
  };

  const displayValue = (val: number, showSign = false) => {
    if (!showAmount) return "****";
    return formatCurrency(val, { showSign });
  };

  return (
    <View className={cn("w-full", className)}>
      {/* Net Worth Card */}
      <View className="w-full bg-slate-800 rounded-3xl p-6 shadow-lg overflow-hidden">
        {/* Header */}
        <View className="flex-row items-center gap-2 mb-1">
          <Text className="text-xs text-white/70 uppercase tracking-wider">
            净资产 ({data.currency})
          </Text>
          <Pressable onPress={togglePrivacy} className="p-1">
            <EyeIcon visible={showAmount} />
          </Pressable>
        </View>

        {/* Net Worth Value */}
        <Text className="text-4xl text-white font-bold tracking-tight mb-6">
          {displayValue(netWorth)}
        </Text>

        {/* Progress Bar */}
        <View className="w-full h-3 bg-white/20 rounded-full mb-2 overflow-hidden flex-row">
          <View
            className="h-full bg-emerald-400 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </View>

        {/* Assets / Liabilities Row */}
        <View className="flex-row justify-between items-center">
          <View>
            <Text className="text-xs text-white/70 mb-0.5">资产</Text>
            <Text className="text-emerald-400 font-medium">
              {showAmount ? `+${formatCurrency(assetsVal)}` : "****"}
            </Text>
          </View>
          <View className="items-end">
            <Text className="text-xs text-white/70 mb-0.5">负债</Text>
            <Text className="text-red-400 font-medium">
              {showAmount ? `-${formatCurrency(liabilitiesVal)}` : "****"}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
