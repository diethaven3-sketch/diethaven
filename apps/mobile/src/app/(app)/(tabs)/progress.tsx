import { Lock } from "lucide-react-native";
import { RefreshControl, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@repo/ui-tokens";
import { useApiQuery } from "@/lib/use-api";
import { useIncrementalList } from "@/lib/use-infinite";
import { InfiniteScrollView } from "@/components/infinite-scroll-view";
import {
  bmiCategory,
  formatDate,
  formatWeightChange,
  weightChange,
  type AnthropometricAssessment,
} from "@/lib/patient-data";
import { Banner } from "@/components/ui/banner";
import { Card } from "@/components/ui/card";
import { Note } from "@/components/ui/note";
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
  // The chart and summary use every measurement; only the table rows are revealed as you scroll.
  const history = useIncrementalList(assessments, 15);

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
      <InfiniteScrollView
        hasMore={history.hasMore}
        onEndReached={history.loadMore}
        contentContainerClassName="gap-4 px-5 pb-28 pt-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refetch} tintColor={colors.primary} />}
      >
        <Text className="font-heading-bold text-xl text-heading">Progress</Text>

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
            <Note icon={Lock}>Recorded by your dietitian at each visit — view only.</Note>

            <View className="gap-4 rounded-[22px] border border-gray-200 bg-white p-4">
              <View className="flex-row gap-4">
                <View className="flex-1">
                  <Text className="font-body text-xs text-muted">Current weight</Text>
                  <Text className="font-heading-bold text-2xl text-heading">
                    {latest.domainData.weight.toFixed(1)} kg
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="font-body text-xs text-muted">Current BMI</Text>
                  <Text className="font-heading-bold text-2xl text-heading">{latest.domainData.bmi.toFixed(1)}</Text>
                  <Text className="font-body text-xs text-muted">{bmiCategory(latest.domainData.bmi)}</Text>
                </View>
              </View>
              {change !== null ? (
                <Text className="font-body-medium text-sm text-primary-dark">{formatWeightChange(change)}</Text>
              ) : null}
            </View>

            <View className="gap-3 rounded-[22px] border border-gray-200 bg-white p-4">
              <Text className="font-heading-bold text-base text-heading">Weight trend</Text>
              <WeightTrendChart assessments={assessments} />
            </View>

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
              {history.visible.map((assessment, index) => (
                <HistoryRow
                  key={assessment.id}
                  assessment={assessment}
                  last={index === history.visible.length - 1}
                />
              ))}
            </Card>
          </>
        )}
      </InfiniteScrollView>
    </SafeAreaView>
  );
}
