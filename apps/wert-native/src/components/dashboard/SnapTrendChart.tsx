import { useMemo, useState, useCallback } from "react";
import { View, useWindowDimensions, Pressable } from "react-native";
import {
  Canvas,
  Path,
  Skia,
  LinearGradient,
  Group,
  Circle,
  vec,
  Line,
  Text as SkiaText,
  useFont,
} from "@shopify/react-native-skia";
import {
  Gesture,
  GestureDetector,
} from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Text } from "@/components/ui/text";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { TrendDataPoint } from "@/types/dashboard";

interface SnapTrendChartProps {
  data: TrendDataPoint[];
  height?: number;
  currency?: string;
}

/**
 * 使用 Skia 实现的趋势图组件
 * 支持触摸交互和震动反馈
 */
export function SnapTrendChart({
  data,
  height = 200,
  currency = "CNY",
}: SnapTrendChartProps) {
  const { width: screenWidth } = useWindowDimensions();
  const chartWidth = screenWidth - 48; // Padding

  const [selectedPoint, setSelectedPoint] = useState<TrendDataPoint | null>(null);
  const indicatorX = useSharedValue(-100);
  const indicatorOpacity = useSharedValue(0);

  const { path, points, minValue, maxValue, gradientColors } = useMemo(() => {
    if (data.length < 2) {
      return {
        path: null,
        points: [],
        minValue: 0,
        maxValue: 0,
        gradientColors: ["#22c55e", "rgba(34,197,94,0)"],
      };
    }

    const values = data.map((d) => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    // Padding for the chart
    const paddingTop = 20;
    const paddingBottom = 40;
    const chartHeight = height - paddingTop - paddingBottom;
    const pointSpacing = chartWidth / (data.length - 1);

    // Generate points
    const pts = data.map((d, i) => {
      const x = i * pointSpacing;
      const y = paddingTop + chartHeight - ((d.value - min) / range) * chartHeight;
      return { x, y, data: d };
    });

    // Create smooth line path
    const linePath = Skia.Path.Make();
    linePath.moveTo(pts[0].x, pts[0].y);

    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1];
      const curr = pts[i];
      const cpx = (prev.x + curr.x) / 2;
      linePath.cubicTo(cpx, prev.y, cpx, curr.y, curr.x, curr.y);
    }

    // Create fill path (area under the line)
    const fillPath = linePath.copy();
    fillPath.lineTo(pts[pts.length - 1].x, height - paddingBottom);
    fillPath.lineTo(pts[0].x, height - paddingBottom);
    fillPath.close();

    // Determine trend color
    const isPositive = data[data.length - 1].value >= data[0].value;
    const colors = isPositive
      ? ["rgba(34,197,94,0.3)", "rgba(34,197,94,0)"]
      : ["rgba(239,68,68,0.3)", "rgba(239,68,68,0)"];

    return {
      path: { line: linePath, fill: fillPath },
      points: pts,
      minValue: min,
      maxValue: max,
      gradientColors: colors,
    };
  }, [data, chartWidth, height]);

  const findClosestPoint = useCallback(
    (touchX: number) => {
      if (points.length === 0) return null;

      let closest = points[0];
      let minDist = Math.abs(touchX - closest.x);

      for (const pt of points) {
        const dist = Math.abs(touchX - pt.x);
        if (dist < minDist) {
          minDist = dist;
          closest = pt;
        }
      }

      return closest;
    },
    [points]
  );

  const handlePointSelect = useCallback((point: typeof points[0] | null) => {
    if (point) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSelectedPoint(point.data);
    } else {
      setSelectedPoint(null);
    }
  }, []);

  const panGesture = Gesture.Pan()
    .onStart((e) => {
      indicatorOpacity.value = withTiming(1, { duration: 150 });
      const pt = findClosestPoint(e.x);
      if (pt) {
        indicatorX.value = pt.x;
        runOnJS(handlePointSelect)(pt);
      }
    })
    .onUpdate((e) => {
      const pt = findClosestPoint(e.x);
      if (pt && pt.x !== indicatorX.value) {
        indicatorX.value = pt.x;
        runOnJS(handlePointSelect)(pt);
      }
    })
    .onEnd(() => {
      indicatorOpacity.value = withTiming(0, { duration: 300 });
      runOnJS(handlePointSelect)(null);
    });

  const indicatorStyle = useAnimatedStyle(() => ({
    position: "absolute",
    left: indicatorX.value - 1,
    top: 0,
    width: 2,
    height: height - 40,
    backgroundColor: "rgba(255,255,255,0.5)",
    opacity: indicatorOpacity.value,
  }));

  if (!path || data.length < 2) {
    return (
      <View className="items-center justify-center p-8">
        <Text color="muted">需要至少2条记录才能显示趋势</Text>
      </View>
    );
  }

  const isPositive = data[data.length - 1].value >= data[0].value;
  const lineColor = isPositive ? "#22c55e" : "#ef4444";

  return (
    <View className="w-full">
      {/* Selected point info */}
      {selectedPoint && (
        <View className="flex-row justify-between items-center mb-2 px-1">
          <Text variant="caption" color="muted">
            {formatDate(selectedPoint.date)}
          </Text>
          <Text variant="body" weight="bold">
            {formatCurrency(selectedPoint.value, { currency })}
          </Text>
        </View>
      )}

      <GestureDetector gesture={panGesture}>
        <View style={{ height }}>
          <Canvas style={{ width: chartWidth, height }}>
            {/* Gradient fill */}
            <Path path={path.fill} style="fill">
              <LinearGradient
                start={vec(0, 0)}
                end={vec(0, height)}
                colors={gradientColors}
              />
            </Path>

            {/* Line */}
            <Path
              path={path.line}
              style="stroke"
              strokeWidth={2.5}
              color={lineColor}
              strokeCap="round"
              strokeJoin="round"
            />

            {/* End point dot */}
            <Circle
              cx={points[points.length - 1]?.x || 0}
              cy={points[points.length - 1]?.y || 0}
              r={5}
              color={lineColor}
            />
            <Circle
              cx={points[points.length - 1]?.x || 0}
              cy={points[points.length - 1]?.y || 0}
              r={3}
              color="#0a0a0a"
            />
          </Canvas>

          {/* Touch indicator */}
          <Animated.View style={indicatorStyle} />
        </View>
      </GestureDetector>

      {/* X-axis labels */}
      <View className="flex-row justify-between mt-2">
        <Text variant="caption" color="muted">
          {data.length > 0 ? formatDate(data[0].date) : ""}
        </Text>
        <Text variant="caption" color="muted">
          {data.length > 0 ? formatDate(data[data.length - 1].date) : ""}
        </Text>
      </View>
    </View>
  );
}
