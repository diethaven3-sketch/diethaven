import { useRef, type ReactNode } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  View,
  type NativeScrollEvent,
  type ScrollViewProps,
} from "react-native";
import { colors } from "@repo/ui-tokens";

/** How close to the bottom (in points) counts as "reached the end". */
const END_THRESHOLD = 320;

interface InfiniteScrollViewProps extends ScrollViewProps {
  children: ReactNode;
  hasMore: boolean;
  loadingMore?: boolean;
  onEndReached: () => void;
  /** Shown once everything is loaded, e.g. "That's your whole diary". */
  endMessage?: string;
}

function nearBottom({ layoutMeasurement, contentOffset, contentSize }: NativeScrollEvent) {
  return layoutMeasurement.height + contentOffset.y >= contentSize.height - END_THRESHOLD;
}

/**
 * A ScrollView that asks for more content as the user nears the bottom. Kept
 * as a ScrollView (not a FlatList) because these screens mix headers, cards
 * and grouped sections that a flat list shape doesn't fit.
 */
export function InfiniteScrollView({
  children,
  hasMore,
  loadingMore = false,
  onEndReached,
  endMessage,
  onScroll,
  onLayout,
  onContentSizeChange,
  ...props
}: InfiniteScrollViewProps) {
  const viewportHeight = useRef(0);

  return (
    <ScrollView
      {...props}
      scrollEventThrottle={200}
      onScroll={(event) => {
        if (hasMore && !loadingMore && nearBottom(event.nativeEvent)) onEndReached();
        onScroll?.(event);
      }}
      onLayout={(event) => {
        viewportHeight.current = event.nativeEvent.layout.height;
        onLayout?.(event);
      }}
      // A first page too short to scroll would never fire onScroll, so keep
      // filling until the content overflows the screen or runs out.
      onContentSizeChange={(width, height) => {
        if (hasMore && !loadingMore && viewportHeight.current > 0 && height < viewportHeight.current + END_THRESHOLD) {
          onEndReached();
        }
        onContentSizeChange?.(width, height);
      }}
    >
      {children}
      {loadingMore ? (
        <View className="items-center py-4">
          <ActivityIndicator color={colors.primary} accessibilityLabel="Loading more" />
        </View>
      ) : !hasMore && endMessage ? (
        <Text className="py-4 text-center font-body text-xs text-muted">{endMessage}</Text>
      ) : null}
    </ScrollView>
  );
}
