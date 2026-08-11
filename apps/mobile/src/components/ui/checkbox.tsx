import { Pressable, Text, View } from "react-native";
import { Check } from "lucide-react-native";

interface CheckboxProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string;
}

export function Checkbox({ label, checked, onChange, error }: CheckboxProps) {
  return (
    <View className="gap-1.5">
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        onPress={() => onChange(!checked)}
        className="min-h-[44px] flex-row items-center gap-3"
      >
        <View
          className={`h-6 w-6 items-center justify-center rounded border-2 ${
            checked ? "border-primary bg-primary" : error ? "border-red-500" : "border-gray-300"
          }`}
        >
          {checked ? <Check size={16} color="white" strokeWidth={3} /> : null}
        </View>
        <Text className="flex-1 font-body text-sm text-body">{label}</Text>
      </Pressable>
      {error ? <Text className="text-sm text-red-600">{error}</Text> : null}
    </View>
  );
}
