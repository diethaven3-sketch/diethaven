import { ActivityIndicator, Text, View } from "react-native";
import { colors } from "@repo/ui-tokens";

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <View className="flex-1 items-center justify-center gap-3 py-16">
      <ActivityIndicator color={colors.primary} />
      <Text className="font-body text-sm text-body">{label}</Text>
    </View>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <View className="items-center gap-2 rounded-xl border border-dashed border-gray-300 bg-white px-6 py-10">
      <Text className="text-center font-heading text-base text-heading">{title}</Text>
      <Text className="text-center font-body text-sm text-body">{description}</Text>
    </View>
  );
}
