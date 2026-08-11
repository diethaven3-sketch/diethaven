import { useState } from "react";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";

const ONBOARDING_KEY = "diethaven_onboarding_seen";

const slides = [
  {
    title: "Your Food, Your Medicine",
    body: "DietHaven Consult connects you with a registered dietitian who guides your nutrition care, step by step.",
  },
  {
    title: "Stay linked with your dietitian",
    body: "Your dietitian records your assessments and tracks your progress — you can see it all in one place.",
  },
  {
    title: "Your data, protected",
    body: "Your health information is encrypted and only shared with the dietitian you're linked to.",
  },
];

export default function Onboarding() {
  const [index, setIndex] = useState(0);
  const slide = slides[index];
  const isLast = index === slides.length - 1;

  const finish = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, "true");
    router.replace("/(auth)/welcome");
  };

  return (
    <SafeAreaView className="flex-1 bg-primary">
      <View className="flex-1 justify-between px-6 py-8">
        <View className="flex-1 items-center justify-center gap-4">
          <Text className="text-center font-heading-bold text-3xl text-white">{slide.title}</Text>
          <Text className="text-center font-body text-base text-white/85">{slide.body}</Text>
        </View>

        <View className="gap-6">
          <View className="flex-row justify-center gap-2">
            {slides.map((s, i) => (
              <View
                key={s.title}
                className={`h-2 w-2 rounded-full ${i === index ? "bg-white" : "bg-white/40"}`}
              />
            ))}
          </View>

          {isLast ? (
            <Button variant="secondary" onPress={finish}>
              Get Started
            </Button>
          ) : (
            <View className="flex-row items-center gap-3">
              <Pressable
                accessibilityRole="button"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                className="min-h-[48px] flex-1 items-center justify-center rounded-lg px-4 py-3 active:bg-white/10"
                onPress={finish}
              >
                <Text className="font-body-medium text-base text-white">Skip</Text>
              </Pressable>
              <Button variant="secondary" className="flex-1" onPress={() => setIndex((i) => i + 1)}>
                Next
              </Button>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
