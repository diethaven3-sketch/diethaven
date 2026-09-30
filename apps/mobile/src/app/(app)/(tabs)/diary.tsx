import { router } from "expo-router";
import { Plus } from "lucide-react-native";
import { Pressable, RefreshControl, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MEAL_TYPE_LABELS } from "@repo/types";
import { colors } from "@repo/ui-tokens";
import { useInfiniteApiQuery } from "@/lib/use-infinite";
import { InfiniteScrollView } from "@/components/infinite-scroll-view";
import { formatDayHeading, formatTime, groupByDay, summariseEntry, type FoodLogEntry } from "@/lib/food-log";
import { Banner } from "@/components/ui/banner";
import { FoodLogItem } from "@/components/ui/food-log-item";
import { EmptyState, LoadingState } from "@/components/ui/states";

export default function Diary() {
  const { items, error, loading, refreshing, refetch, loadingMore, hasMore, loadMore } =
    useInfiniteApiQuery<FoodLogEntry>("/food-logs", 20);
  const days = groupByDay(items);

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
      <InfiniteScrollView
        hasMore={hasMore && !error}
        loadingMore={loadingMore}
        onEndReached={loadMore}
        endMessage={days.length > 0 ? "That's the start of your diary." : undefined}
        contentContainerClassName="gap-5 px-5 pb-28 pt-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refetch} tintColor={colors.primary} />}
      >
        <View className="flex-row items-center justify-between">
          <Text className="font-heading-bold text-xl text-heading">Food Diary</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Log a meal"
            onPress={() => router.push("/(app)/log-meal")}
            className="h-9 w-9 items-center justify-center rounded-full bg-primary active:bg-primary-dark"
          >
            <Plus size={18} color="white" />
          </Pressable>
        </View>

        {loading ? (
          <LoadingState />
        ) : error && items.length === 0 ? (
          <Banner tone="danger">{error}</Banner>
        ) : days.length === 0 ? (
          <EmptyState
            title="Nothing logged yet"
            description="Record what you eat and your dietitian can see how the plan is going between visits."
          />
        ) : (
          days.map((day) => (
            <View key={day.date} className="gap-2.5">
              <Text className="font-heading-bold text-base text-heading">{formatDayHeading(day.date)}</Text>
              {day.entries.map((entry) => (
                <FoodLogItem
                  key={entry.id}
                  mealType={MEAL_TYPE_LABELS[entry.mealType]}
                  foodName={summariseEntry(entry)}
                  meta={`${entry.items.length} item${entry.items.length === 1 ? "" : "s"} · ${formatTime(entry.date)}`}
                  onPress={() => router.push({ pathname: "/(app)/log-meal", params: { id: entry.id } })}
                />
              ))}
            </View>
          ))
        )}
        {error && items.length > 0 ? <Banner tone="danger">{error}</Banner> : null}
      </InfiniteScrollView>
    </SafeAreaView>
  );
}
