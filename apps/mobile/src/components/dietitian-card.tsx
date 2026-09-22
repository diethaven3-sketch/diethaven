import { Pressable, Text, View } from "react-native";
import { ChevronRight, Stethoscope } from "lucide-react-native";

interface DietitianCardProps {
  role?: string;
  name: string;
  onPress?: () => void;
}

/** Promo-style card for the patient's linked dietitian — used on Home, Profile, and Accept Invite. */
export function DietitianCard({ role = "Your dietitian", name, onPress }: DietitianCardProps) {
  const content = (
    <View className="flex-row items-center gap-3 rounded-[22px] bg-primary p-4">
      <View className="h-12 w-12 items-center justify-center rounded-full bg-white/20">
        <Stethoscope size={24} color="white" />
      </View>
      <View className="flex-1 gap-0.5">
        <Text className="font-body text-[11px] text-white/70">{role}</Text>
        <Text className="font-heading-bold text-base text-white" numberOfLines={1}>
          {name}
        </Text>
      </View>
      {onPress ? <ChevronRight size={18} color="white" /> : null}
    </View>
  );

  if (!onPress) {
    return content;
  }

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={name} onPress={onPress} className="active:opacity-90">
      {content}
    </Pressable>
  );
}
