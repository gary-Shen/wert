import { Slot } from "expo-router";

/**
 * Tabs 布局 - 使用 Slot 让内部页面自行处理切换
 * 三屏看板的手势滑动在 index.tsx 中使用 PagerView 实现
 */
// 这是一个空布局，因为 index.tsx 处理了所有 Tab 逻辑
export default function TabsLayout() {
  return <Slot />;
}
