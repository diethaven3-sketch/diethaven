import type { ComponentType } from "react";
import { Pressable, Text, View } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { colors } from "@repo/ui-tokens";

interface LinkRowProps {
  label: string;
  description?: string;
  icon?: ComponentType<{ size?: number; color?: string }>;
  onPress: () => void;
  last?: boolean;
}

export function LinkRow({ label, description, icon: Icon, onPress, last = false }: LinkRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className={`min-h-[56px] flex-row items-center gap-3 py-3 active:opacity-60 ${
        last ? "" : "border-b border-gray-100"
      }`}
    >
      {Icon ? <Icon size={20} color={colors.primary} /> : null}
      <View className="flex-1">
        <Text className="font-body-medium text-base text-heading">{label}</Text>
        {description ? <Text className="font-body text-sm text-body">{description}</Text> : null}
      </View>
      <ChevronRight size={18} color="#9CA3AF" />
    </Pressable>
  );
}
