import { View, type ViewProps } from "react-native";

export function Card({ className, ...props }: ViewProps) {
  return (
    <View
      className={`rounded-xl border border-gray-200 bg-white p-5 ${className ?? ""}`}
      {...props}
    />
  );
}
