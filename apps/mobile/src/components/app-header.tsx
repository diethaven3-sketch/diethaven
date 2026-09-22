import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { ChevronLeft } from "lucide-react-native";

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  /** Shows a back chevron that pops the stack. */
  back?: boolean;
  right?: ReactNode;
}

export function AppHeader({ title, subtitle, back = false, right }: AppHeaderProps) {
  return (
    <View className="flex-row items-center gap-3 bg-primary px-6 py-4">
      {back ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          onPress={() => router.back()}
          className="-ml-1"
        >
          <ChevronLeft size={24} color="white" />
        </Pressable>
      ) : null}
      <View className="flex-1">
        <Text className="font-heading-bold text-lg text-white" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text className="font-body text-sm text-white/80" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}
