import { RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@repo/ui-tokens";
import { useApiQuery } from "@/lib/use-api";
import {
  bmiCategory,
  formatDate,
  formatWeightChange,
  weightChange,
  type AnthropometricAssessment,
} from "@/lib/patient-data";
import { AppHeader } from "@/components/app-header";
import { Card } from "@/components/ui/card";
import { Banner } from "@/components/ui/banner";
import { EmptyState, LoadingState } from "@/components/ui/states";
import { WeightTrendChart } from "@/components/weight-trend-chart";

function HistoryRow({ assessment, last }: { assessment: AnthropometricAssessment; last: boolean }) {
  const { height, weight, bmi } = assessment.domainData;
  return (
    <View className={`flex-row items-center gap-3 py-3 ${last ? "" : "border-b border-gray-100"}`}>
      <Text className="flex-1 font-body text-sm text-body">{formatDate(assessment.date)}</Text>
      <Text className="w-20 text-right font-body-medium text-sm text-heading">{weight.toFixed(1)} kg</Text>
      <Text className="w-16 text-right font-body text-sm text-body">{height} cm</Text>
      <Text className="w-14 text-right font-body-medium text-sm text-heading">{bmi.toFixed(1)}</Text>
    </View>
  );
}

export default function Progress() {
  const { data, error, loading, refreshing, refetch } = useApiQuery<AnthropometricAssessment[]>(
    "/patient/assessments",
  );

  const assessments = data ?? [];
  const latest = assessments[0];
  const change = weightChange(assessments);

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
      <AppHeader title="Progress" subtitle="Weight and BMI history" />

      <ScrollView
        contentContainerClassName="gap-5 px-6 py-6"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refetch} tintColor={colors.primary} />}
      >
        {loading ? (
          <LoadingState />
        ) : error ? (
          <Banner tone="danger">{error}</Banner>
        ) : assessments.length === 0 ? (
          <EmptyState
            title="Nothing to chart yet"
            description="Your weight and BMI history appears here once your dietitian records your first measurement."
          />
        ) : (
          <>
            <Banner tone="info">
              These measurements are recorded by your dietitian during your visits. You can view them, but only your
              dietitian can change them.
            </Banner>

            <Card className="gap-4">
              <View className="flex-row gap-4">
                <View className="flex-1">
                  <Text className="font-body text-xs uppercase tracking-wide text-body">Current weight</Text>
                  <Text className="font-heading-bold text-2xl text-heading">
                    {latest.domainData.weight.toFixed(1)} kg
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="font-body text-xs uppercase tracking-wide text-body">Current BMI</Text>
                  <Text className="font-heading-bold text-2xl text-heading">{latest.domainData.bmi.toFixed(1)}</Text>
                  <Text className="font-body text-xs text-body">{bmiCategory(latest.domainData.bmi)}</Text>
                </View>
              </View>
              {change !== null ? (
                <Text className="font-body-medium text-sm text-primary-dark">{formatWeightChange(change)}</Text>
              ) : null}
            </Card>

            <Card>
              <Text className="mb-3 font-heading text-base text-heading">Weight trend</Text>
              <WeightTrendChart assessments={assessments} />
            </Card>

            <Card>
              <Text className="font-heading text-base text-heading">All measurements</Text>
              <View className="mt-1 flex-row items-center gap-3 border-b border-gray-200 pb-2">
                <Text className="flex-1 font-body-medium text-xs uppercase tracking-wide text-body">Date</Text>
                <Text className="w-20 text-right font-body-medium text-xs uppercase tracking-wide text-body">
                  Weight
                </Text>
                <Text className="w-16 text-right font-body-medium text-xs uppercase tracking-wide text-body">
                  Height
                </Text>
                <Text className="w-14 text-right font-body-medium text-xs uppercase tracking-wide text-body">BMI</Text>
              </View>
              {assessments.map((assessment, index) => (
                <HistoryRow
                  key={assessment.id}
                  assessment={assessment}
                  last={index === assessments.length - 1}
                />
              ))}
            </Card>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
