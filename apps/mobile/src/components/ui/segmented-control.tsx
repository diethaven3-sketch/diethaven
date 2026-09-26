import { Pressable, Text, View } from "react-native";

interface SegmentedControlProps<T extends string> {
  label: string;
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
  error?: string;
}

export function SegmentedControl<T extends string>({ label, options, value, onChange, error }: SegmentedControlProps<T>) {
  return (
    <View className="gap-1.5">
      <Text className="font-body-medium text-sm text-heading">{label}</Text>
      <View className="flex-row gap-2">
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => onChange(option.value)}
              className={`min-h-[44px] flex-1 items-center justify-center rounded-lg border px-3 py-2.5 ${
                selected ? "border-primary bg-surface-alt" : error ? "border-red-500 bg-white" : "border-gray-300 bg-white"
              }`}
            >
              <Text className={`font-body-medium text-sm ${selected ? "text-primary-dark" : "text-body"}`}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <Text className="font-body text-xs text-danger">{error}</Text> : null}
    </View>
  );
}
