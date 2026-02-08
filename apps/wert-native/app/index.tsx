import { Redirect } from "expo-router";
import { useUserStore } from "@/stores/userStore";

/**
 * 根路径 - 根据 setupComplete 决定跳转
 */
export default function Index() {
  const { setupComplete } = useUserStore();

  if (!setupComplete) {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/(tabs)" />;
}
