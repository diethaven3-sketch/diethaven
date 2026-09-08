import { router } from "expo-router";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Plus } from "lucide-react-native";
import { MEAL_TYPE_LABELS } from "@repo/types";
import { colors } from "@repo/ui-tokens";
import { useApiQuery } from "@/lib/use-api";
import { formatDayHeading, formatTime, groupByDay, summariseEntry, type FoodLogEntry } from "@/lib/food-log";
import { AppHeader } from "@/components/app-header";
import { Card } from "@/components/ui/card";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { EmptyState, LoadingState } from "@/components/ui/states";

function EntryCard({ entry }: { entry: FoodLogEntry }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Edit ${MEAL_TYPE_LABELS[entry.mealType]} entry`}
      onPress={() => router.push({ pathname: "/(app)/log-meal", params: { id: entry.id } })}
      className="active:opacity-60"
    >
      <Card>
        <View className="flex-row items-center justify-between">
          <Text className="font-body-medium text-sm text-heading">{MEAL_TYPE_LABELS[entry.mealType]}</Text>
          <Text className="font-body text-xs text-body">{formatTime(entry.date)}</Text>
        </View>
        <Text className="mt-1 font-body text-sm text-body">{summariseEntry(entry)}</Text>
        {entry.symptoms ? (
          <Text className="mt-1 font-body text-xs text-secondary-dark">Symptoms: {entry.symptoms}</Text>
        ) : null}
      </Card>
    </Pressable>
  );
}

export default function Diary() {
  const { data, error, loading, refreshing, refetch } = useApiQuery<FoodLogEntry[]>("/food-logs");
  const days = groupByDay(data ?? []);

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
      <AppHeader title="Food diary" subtitle="What you ate, in your own words" />

      <ScrollView
        contentContainerClassName="gap-5 px-6 py-6"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refetch} tintColor={colors.primary} />}
      >
        {loading ? (
          <LoadingState />
        ) : error ? (
          <Banner tone="danger">{error}</Banner>
        ) : (
          <>
            <Button onPress={() => router.push("/(app)/log-meal")}>Log a meal</Button>

            {days.length === 0 ? (
              <EmptyState
                title="Nothing logged yet"
                description="Record what you eat and your dietitian can see how the plan is going between visits."
              />
            ) : (
              days.map((day) => (
                <View key={day.date} className="gap-3">
                  <Text className="font-heading text-base text-heading">{formatDayHeading(day.date)}</Text>
                  {day.entries.map((entry) => (
                    <EntryCard key={entry.id} entry={entry} />
                  ))}
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Log a meal"
        onPress={() => router.push("/(app)/log-meal")}
        className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-secondary active:bg-secondary-dark"
      >
        <Plus size={24} color="white" />
      </Pressable>
    </SafeAreaView>
  );
}
