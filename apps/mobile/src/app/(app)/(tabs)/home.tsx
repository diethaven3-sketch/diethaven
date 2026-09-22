import { router } from "expo-router";
import { Bell } from "lucide-react-native";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MEAL_TYPE_LABELS, MEAL_TYPES_FOR_LOGGING } from "@repo/types";
import { colors } from "@repo/ui-tokens";
import { useApiQuery } from "@/lib/use-api";
import {
  bmiCategory,
  type AnthropometricAssessment,
  type LinkedDietitian,
  type PatientProfile,
} from "@/lib/patient-data";
import { formatTime, groupByDay, summariseEntry, type FoodLogEntry } from "@/lib/food-log";
import { DietitianCard } from "@/components/dietitian-card";
import { StatCard } from "@/components/ui/stat-card";
import { FoodLogItem } from "@/components/ui/food-log-item";
import { Button } from "@/components/ui/button";
import { Banner } from "@/components/ui/banner";
import { EmptyState, LoadingState } from "@/components/ui/states";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function todayHeading(): string {
  return new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
}

export default function Home() {
  const profile = useApiQuery<PatientProfile>("/auth/profile");
  const assessments = useApiQuery<AnthropometricAssessment[]>("/patient/assessments");
  const dietitian = useApiQuery<LinkedDietitian | null>("/patient/dietitian");
  const foodLogs = useApiQuery<FoodLogEntry[]>("/food-logs");

  const loading = profile.loading || assessments.loading || dietitian.loading || foodLogs.loading;
  const refreshing = profile.refreshing || assessments.refreshing || dietitian.refreshing || foodLogs.refreshing;
  const onRefresh = () => {
    profile.refetch();
    assessments.refetch();
    dietitian.refetch();
    foodLogs.refetch();
  };

  const firstName = profile.data?.name.split(" ")[0];
  const latest = assessments.data?.[0];

  const today = new Date().toISOString().slice(0, 10);
  const todayEntries = (foodLogs.data ?? []).filter((entry) => entry.date.slice(0, 10) === today);
  const loggedCount = Math.min(todayEntries.length, MEAL_TYPES_FOR_LOGGING.length);
  const progressPercent = Math.round((loggedCount / MEAL_TYPES_FOR_LOGGING.length) * 100);
  const recentEntries = groupByDay(foodLogs.data ?? [])[0]?.entries.slice(0, 2) ?? [];

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
      <ScrollView
        contentContainerClassName="gap-6 px-5 pb-28 pt-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {loading ? (
          <LoadingState />
        ) : (
          <>
            <View className="flex-row items-center justify-between">
              <View className="gap-0.5">
                <Text className="font-heading-bold text-lg text-heading">
                  {firstName ? `${greeting()}, ${firstName}` : greeting()}
                </Text>
                <Text className="font-body text-[13px] text-muted">{todayHeading()}</Text>
              </View>
              <View className="h-10 w-10 items-center justify-center rounded-full bg-surface-alt">
                <Bell size={18} color={colors.primaryDark} />
              </View>
            </View>

            {dietitian.error ? (
              <Banner tone="danger">{dietitian.error}</Banner>
            ) : dietitian.data ? (
              <DietitianCard
                name={dietitian.data.name}
                role="Your dietitian"
                onPress={() => router.push("/(app)/dietitian")}
              />
            ) : (
              <EmptyState
                title="No dietitian linked yet"
                description="Once a dietitian invites you, their details will appear here."
              />
            )}

            <View className="gap-2.5">
              <View className="flex-row items-center justify-between">
                <Text className="font-heading-bold text-base text-heading">Your latest numbers</Text>
                <Text
                  className="font-body-medium text-[13px] text-primary"
                  onPress={() => router.push("/(app)/(tabs)/progress")}
                >
                  View trends
                </Text>
              </View>
              {assessments.error ? (
                <Banner tone="danger">{assessments.error}</Banner>
              ) : latest ? (
                <View className="flex-row gap-3">
                  <StatCard label="Weight" value={latest.domainData.weight.toFixed(1)} unit="kg" />
                  <StatCard label="BMI" value={latest.domainData.bmi.toFixed(1)} unit={bmiCategory(latest.domainData.bmi)} />
                </View>
              ) : (
                <EmptyState
                  title="No measurements yet"
                  description="Your dietitian will record your height and weight at your next visit."
                />
              )}
            </View>

            <View className="gap-3 rounded-[22px] border border-gray-200 bg-white p-4">
              <View className="flex-row items-center justify-between">
                <Text className="font-heading-bold text-base text-heading">Today&apos;s food diary</Text>
                <Text className="font-body-medium text-xs text-secondary">
                  {loggedCount} of {MEAL_TYPES_FOR_LOGGING.length} logged
                </Text>
              </View>
              <View className="h-2 overflow-hidden rounded-full bg-surface-alt">
                <View className="h-2 rounded-full bg-primary" style={{ width: `${progressPercent}%` }} />
              </View>
              <Button onPress={() => router.push("/(app)/log-meal")}>Log a meal</Button>
            </View>

            {recentEntries.length > 0 ? (
              <View className="gap-2.5">
                <Text className="font-heading-bold text-base text-heading">Recent entries</Text>
                {recentEntries.map((entry) => (
                  <FoodLogItem
                    key={entry.id}
                    mealType={MEAL_TYPE_LABELS[entry.mealType]}
                    foodName={summariseEntry(entry)}
                    meta={`${entry.items.length} item${entry.items.length === 1 ? "" : "s"} · ${formatTime(entry.date)}`}
                    onPress={() => router.push({ pathname: "/(app)/log-meal", params: { id: entry.id } })}
                  />
                ))}
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
