import type { ComponentType } from "react";
import { Text, View } from "react-native";
import { Info } from "lucide-react-native";
import { colors } from "@repo/ui-tokens";

interface NoteProps {
  children: string;
  icon?: ComponentType<{ size?: number; color?: string }>;
}

/** Tinted inline note used for read-only/consent-adjacent context across forms. */
export function Note({ children, icon: Icon = Info }: NoteProps) {
  return (
    <View className="flex-row items-center gap-2 rounded-[14px] bg-surface-alt p-3">
      <Icon size={14} color={colors.primaryDark} />
      <Text className="flex-1 font-body text-xs leading-5 text-primary-dark">{children}</Text>
    </View>
  );
}
