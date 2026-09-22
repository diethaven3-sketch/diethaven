import { Text, View, type ViewProps } from "react-native";

interface StatCardProps extends ViewProps {
  label: string;
  value: string;
  unit: string;
}

export function StatCard({ label, value, unit, className, ...props }: StatCardProps) {
  return (
    <View className={`flex-1 gap-1 rounded-[14px] border border-gray-200 bg-white p-4 ${className ?? ""}`} {...props}>
      <Text className="font-body text-xs text-muted">{label}</Text>
      <View className="flex-row items-end gap-1">
        <Text className="font-heading-bold text-2xl text-heading">{value}</Text>
        <Text className="font-body text-sm text-muted">{unit}</Text>
      </View>
    </View>
  );
}
