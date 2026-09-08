import { Redirect, Stack } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { colors } from "@repo/ui-tokens";
import { useAuth } from "@/lib/auth-context";

export default function AppLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/(auth)/welcome" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
