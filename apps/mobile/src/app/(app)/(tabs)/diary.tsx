import { router } from "expo-router";
import { Plus } from "lucide-react-native";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MEAL_TYPE_LABELS } from "@repo/types";
import { colors } from "@repo/ui-tokens";
import { useApiQuery } from "@/lib/use-api";
import { formatDayHeading, formatTime, groupByDay, summariseEntry, type FoodLogEntry } from "@/lib/food-log";
import { Banner } from "@/components/ui/banner";
import { FoodLogItem } from "@/components/ui/food-log-item";
import { EmptyState, LoadingState } from "@/components/ui/states";

export default function Diary() {
  const { data, error, loading, refreshing, refetch } = useApiQuery<FoodLogEntry[]>("/food-logs");
  const days = groupByDay(data ?? []);

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
      <ScrollView
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
        ) : error ? (
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
      </ScrollView>
    </SafeAreaView>
  );
}
