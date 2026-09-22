import type { ComponentType } from "react";
import { Pressable, Text, View } from "react-native";
import { ChevronRight, Salad } from "lucide-react-native";
import { colors } from "@repo/ui-tokens";

interface FoodLogItemProps {
  mealType: string;
  foodName: string;
  meta: string;
  icon?: ComponentType<{ size?: number; color?: string }>;
  onPress?: () => void;
}

export function FoodLogItem({ mealType, foodName, meta, icon: Icon = Salad, onPress }: FoodLogItemProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${mealType}: ${foodName}`}
      onPress={onPress}
      disabled={!onPress}
      className="flex-row items-center gap-3 rounded-[14px] border border-gray-200 bg-white p-3.5 active:bg-surface-alt"
    >
      <View className="h-11 w-11 items-center justify-center rounded-lg bg-surface-alt">
        <Icon size={22} color={colors.primary} />
      </View>
      <View className="flex-1 gap-0.5">
        <Text className="font-body-medium text-[11px] text-secondary">{mealType}</Text>
        <Text className="font-body-medium text-sm text-heading" numberOfLines={1}>
          {foodName}
        </Text>
        <Text className="font-body text-xs text-muted">{meta}</Text>
      </View>
      {onPress ? <ChevronRight size={18} color={colors.textMuted} /> : null}
    </Pressable>
  );
}
