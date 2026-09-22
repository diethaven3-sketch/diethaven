import { Text, View } from "react-native";

interface DetailRowProps {
  label: string;
  value: string | null | undefined;
  /** Shown in place of the value when it's missing. */
  fallback?: string;
  /** Drop the divider on the final row of a group. */
  last?: boolean;
}

export function DetailRow({ label, value, fallback = "Not provided", last = false }: DetailRowProps) {
  return (
    <View className={`flex-row items-start justify-between gap-4 py-3 ${last ? "" : "border-b border-gray-100"}`}>
      <Text className="font-body-medium text-sm text-body">{label}</Text>
      <Text className="flex-1 text-right font-body text-sm text-heading">{value || fallback}</Text>
    </View>
  );
}
