import { Pressable, Text, View } from "react-native";
import { Check } from "lucide-react-native";

interface ConsentBoxProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string;
}

/** Highlighted consent statement used at registration — NDPA 2023 capture. */
export function ConsentBox({ label, checked, onChange, error }: ConsentBoxProps) {
  return (
    <View className="gap-1.5">
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        onPress={() => onChange(!checked)}
        className={`min-h-[44px] flex-row items-start gap-2.5 rounded-[14px] bg-surface-alt p-3.5 ${
          error ? "border border-red-400" : ""
        }`}
      >
        <View
          className={`mt-0.5 h-5 w-5 items-center justify-center rounded ${checked ? "bg-primary" : "border-2 border-gray-300 bg-white"}`}
        >
          {checked ? <Check size={14} color="white" strokeWidth={3} /> : null}
        </View>
        <Text className="flex-1 font-body text-xs leading-5 text-body">{label}</Text>
      </Pressable>
      {error ? <Text className="text-sm text-red-600">{error}</Text> : null}
    </View>
  );
}
