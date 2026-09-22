import { View, type ViewProps } from "react-native";

interface CardProps extends ViewProps {
  /** Drops the default padding, for cards that hold edge-to-edge rows. */
  flush?: boolean;
}

export function Card({ flush = false, className, ...props }: CardProps) {
  return (
    <View
      className={`rounded-xl border border-gray-200 bg-white ${flush ? "" : "p-5"} ${className ?? ""}`}
      {...props}
    />
  );
}
