import { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ActivityIndicator, View } from "react-native";
import { colors } from "@repo/ui-tokens";
import { useAuth } from "@/lib/auth-context";

const ONBOARDING_KEY = "diethaven_onboarding_seen";

export default function Index() {
  const { user, loading } = useAuth();
  const [onboardingSeen, setOnboardingSeen] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then((value) => setOnboardingSeen(value === "true"));
  }, []);

  if (loading || onboardingSeen === null) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!onboardingSeen) {
    return <Redirect href="/onboarding" />;
  }

  if (!user) {
    return <Redirect href="/(auth)/welcome" />;
  }

  return <Redirect href="/(app)/(tabs)/home" />;
}
