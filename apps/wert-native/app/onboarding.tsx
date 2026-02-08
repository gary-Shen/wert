import { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useUserStore } from "@/stores/userStore";

const REGIONS = [
  { value: "CN" as const, label: "中国大陆", icon: "🇨🇳" },
  { value: "OVERSEAS" as const, label: "海外/其他", icon: "🌏" },
];

const CURRENCIES = [
  { value: "CNY", label: "人民币", symbol: "¥" },
  { value: "USD", label: "美元", symbol: "$" },
  { value: "HKD", label: "港币", symbol: "HK$" },
  { value: "EUR", label: "欧元", symbol: "€" },
  { value: "JPY", label: "日元", symbol: "¥" },
];

export default function OnboardingScreen() {
  const [step, setStep] = useState<"region" | "currency">("region");
  const [selectedRegion, setSelectedRegion] = useState<"CN" | "OVERSEAS" | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState("CNY");

  const { setRegion, setBaseCurrency, setSetupComplete } = useUserStore();

  const handleRegionSelect = (region: "CN" | "OVERSEAS") => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedRegion(region);
    // 预设货币
    if (region === "CN") {
      setSelectedCurrency("CNY");
    } else {
      setSelectedCurrency("USD");
    }
    setStep("currency");
  };

  const handleComplete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setRegion(selectedRegion);
    setBaseCurrency(selectedCurrency);
    setSetupComplete(true);
    router.replace("/(tabs)");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={{ flex: 1, paddingHorizontal: 32 }}>
        {step === "region" && (
          <View style={{ flex: 1, justifyContent: "center" }}>
            <Text style={{ fontSize: 28, fontWeight: "bold", marginBottom: 8 }}>
              {"Welcome"}
            </Text>
            <Text style={{ fontSize: 16, color: "#888", marginBottom: 40 }}>
              {"Select your region to get started"}
            </Text>

            <View style={{ gap: 12 }}>
              {REGIONS.map((region) => (
                <Pressable
                  key={region.value}
                  onPress={() => handleRegionSelect(region.value)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    padding: 20,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: "#e5e5e5",
                    gap: 16,
                  }}
                >
                  <Text style={{ fontSize: 32 }}>{region.icon}</Text>
                  <Text style={{ fontSize: 18, fontWeight: "600" }}>{region.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {step === "currency" && (
          <View style={{ flex: 1, justifyContent: "center" }}>
            <Text style={{ fontSize: 28, fontWeight: "bold", marginBottom: 8 }}>
              {"Base Currency"}
            </Text>
            <Text style={{ fontSize: 16, color: "#888", marginBottom: 40 }}>
              {"Choose your primary currency for net worth calculation"}
            </Text>

            <View style={{ gap: 10 }}>
              {CURRENCIES.map((currency) => {
                const isSelected = selectedCurrency === currency.value;
                return (
                  <Pressable
                    key={currency.value}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedCurrency(currency.value);
                    }}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: 16,
                      borderRadius: 12,
                      borderWidth: isSelected ? 2 : 1,
                      borderColor: isSelected ? "#000" : "#e5e5e5",
                      backgroundColor: isSelected ? "#f5f5f5" : "#fff",
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                      <Text style={{ fontSize: 20, fontWeight: "bold", width: 32, textAlign: "center" }}>
                        {currency.symbol}
                      </Text>
                      <Text style={{ fontSize: 16 }}>{currency.label}</Text>
                    </View>
                    <Text style={{ fontSize: 14, color: "#888" }}>{currency.value}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              onPress={handleComplete}
              style={{
                marginTop: 32,
                paddingVertical: 16,
                backgroundColor: "#000",
                borderRadius: 14,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#fff", fontSize: 17, fontWeight: "600" }}>
                {"Get Started"}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setStep("region")}
              style={{ marginTop: 12, alignItems: "center" }}
            >
              <Text style={{ color: "#888", fontSize: 15 }}>{"Back"}</Text>
            </Pressable>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
