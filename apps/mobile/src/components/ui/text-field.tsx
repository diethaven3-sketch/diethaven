import { forwardRef } from "react";
import { Text, TextInput, View, type TextInputProps } from "react-native";

interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string;
}

export const TextField = forwardRef<TextInput, TextFieldProps>(({ label, error, className, ...props }, ref) => {
  return (
    <View className="gap-1.5">
      <Text className="font-body-medium text-sm text-heading">{label}</Text>
      <TextInput
        ref={ref}
        className={`min-h-[48px] rounded-lg border bg-white px-3.5 py-3 font-body text-base text-body ${
          error ? "border-red-500" : "border-gray-300"
        } ${className ?? ""}`}
        placeholderTextColor="#9CA3AF"
        accessibilityLabel={label}
        {...props}
      />
      {error ? <Text className="text-sm text-red-600">{error}</Text> : null}
    </View>
  );
});
TextField.displayName = "TextField";
