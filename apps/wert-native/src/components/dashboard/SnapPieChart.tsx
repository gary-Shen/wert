import { useMemo, useState } from "react";
import { View, Pressable, useWindowDimensions } from "react-native";
import {
  Canvas,
  Path,
  Skia,
  Group,
  Circle,
  Shadow,
} from "@shopify/react-native-skia";
import * as Haptics from "expo-haptics";
import { Text } from "@/components/ui/text";
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

function getCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category] || category;
}

interface SnapPieChartProps {
  data: ChartData[];
  size?: number;
}

/**
 * 使用 Skia 实现的饼图组件
 */
export function SnapPieChart({ data, size: propSize }: SnapPieChartProps) {
  const { width: screenWidth } = useWindowDimensions();
  const size = propSize || Math.min(screenWidth - 64, 280);
  const [selectedSlice, setSelectedSlice] = useState<ChartData | null>(null);

  const { categoryData, paths, legendItems } = useMemo(() => {
    // Filter valid data
    const validData = data.filter((d) => d.value > 0);
    const totalValue = validData.reduce((acc, cur) => acc + cur.value, 0);

    if (totalValue === 0) {
      return { categoryData: [], paths: [], legendItems: [] };
    }

    // Aggregate by category
    const categoryMap = new Map<string, number>();
    validData.forEach((d) => {
      const cat = d.category || "OTHER";
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + d.value);
    });

    const catData = Array.from(categoryMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Generate pie paths
    const centerX = size / 2;
    const centerY = size / 2;
    const outerRadius = size / 2 - 8;
    const innerRadius = outerRadius * 0.5;

    let currentAngle = -Math.PI / 2; // Start from top
    const generatedPaths: Array<{
      path: any;
      color: string;
      data: ChartData;
    }> = [];

    catData.forEach((item) => {
      const sweepAngle = (item.value / totalValue) * Math.PI * 2;

      // Create arc path
      const path = Skia.Path.Make();

      // Outer arc
      const outerX1 = centerX + outerRadius * Math.cos(currentAngle);
      const outerY1 = centerY + outerRadius * Math.sin(currentAngle);
      const outerX2 =
        centerX + outerRadius * Math.cos(currentAngle + sweepAngle);
      const outerY2 =
        centerY + outerRadius * Math.sin(currentAngle + sweepAngle);

      // Inner arc
      const innerX1 =
        centerX + innerRadius * Math.cos(currentAngle + sweepAngle);
      const innerY1 =
        centerY + innerRadius * Math.sin(currentAngle + sweepAngle);
      const innerX2 = centerX + innerRadius * Math.cos(currentAngle);
      const innerY2 = centerY + innerRadius * Math.sin(currentAngle);

      path.moveTo(outerX1, outerY1);

      // Outer arc
      path.arcToOval(
        {
          x: centerX - outerRadius,
          y: centerY - outerRadius,
          width: outerRadius * 2,
          height: outerRadius * 2,
        },
        (currentAngle * 180) / Math.PI,
        (sweepAngle * 180) / Math.PI,
        false
      );

      // Line to inner arc
      path.lineTo(innerX1, innerY1);

      // Inner arc (reverse direction)
      path.arcToOval(
        {
          x: centerX - innerRadius,
          y: centerY - innerRadius,
          width: innerRadius * 2,
          height: innerRadius * 2,
        },
        ((currentAngle + sweepAngle) * 180) / Math.PI,
        (-sweepAngle * 180) / Math.PI,
        false
      );

      path.close();

      const color = hslToRgba(getCategoryColor(item.name), 1);

      generatedPaths.push({
        path,
        color,
        data: {
          name: item.name,
          value: item.value,
          category: item.name as ChartData["category"],
        },
      });

      currentAngle += sweepAngle;
    });

    // Legend items
    const legends = catData.map((item) => ({
      name: getCategoryLabel(item.name),
      color: hslToRgba(getCategoryColor(item.name), 1),
      value: item.value,
      percentage: ((item.value / totalValue) * 100).toFixed(1),
    }));

    return {
      categoryData: catData,
      paths: generatedPaths,
      legendItems: legends,
    };
  }, [data, size]);

  const handlePress = (item: ChartData) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedSlice((prev) =>
      prev?.name === item.name ? null : item
    );
  };

  if (categoryData.length === 0) {
    return (
      <View className="items-center justify-center p-8">
        <Text color="muted">暂无资产数据可显示</Text>
      </View>
    );
  }

  return (
    <View className="items-center">
      {/* Pie Chart */}
      <Canvas style={{ width: size, height: size }}>
        <Group>
          {paths.map((item, index) => {
            const isSelected = selectedSlice?.name === item.data.name;
            const opacity = selectedSlice
              ? isSelected
                ? 1
                : 0.4
              : 1;

            return (
              <Path
                key={index}
                path={item.path}
                color={item.color}
                style="fill"
                opacity={opacity}
              >
                {isSelected && <Shadow dx={0} dy={4} blur={8} color="rgba(0,0,0,0.3)" />}
              </Path>
            );
          })}
          {/* Center circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={size / 2 * 0.5 - 2}
            color="#0a0a0a"
          />
        </Group>
      </Canvas>

      {/* Legend */}
      <View className="flex-row flex-wrap justify-center gap-3 mt-4">
        {legendItems.map((item, index) => (
          <Pressable
            key={index}
            onPress={() =>
              handlePress({
                name: categoryData[index].name,
                value: item.value,
                category: categoryData[index].name as ChartData["category"],
              })
            }
            className="flex-row items-center"
          >
            <View
              className="w-3 h-3 rounded-sm mr-1.5"
              style={{ backgroundColor: item.color }}
            />
            <Text variant="caption" color="muted">
              {item.name}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Selected slice detail */}
      {selectedSlice && (
        <View className="bg-card border border-border rounded-2xl p-4 mt-4 w-full">
          <View className="flex-row justify-between items-center">
            <View>
              <Text variant="caption" color="muted">
                {getCategoryLabel(selectedSlice.name)}
              </Text>
              <Text variant="title" weight="bold">
                {selectedSlice.value.toLocaleString()}
              </Text>
            </View>
            <Pressable
              onPress={() => setSelectedSlice(null)}
              className="p-2"
            >
              <Text color="muted">✕</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}
