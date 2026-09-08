import { router } from "expo-router";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stethoscope, TrendingUp } from "lucide-react-native";
import { colors } from "@repo/ui-tokens";
import { useApiQuery } from "@/lib/use-api";
import {
  bmiCategory,
  formatDate,
  formatWeightChange,
  weightChange,
  type AnthropometricAssessment,
  type LinkedDietitian,
  type PatientProfile,
} from "@/lib/patient-data";
import { AppHeader } from "@/components/app-header";
import { Card } from "@/components/ui/card";
import { Banner } from "@/components/ui/banner";
import { LinkRow } from "@/components/ui/link-row";
import { EmptyState, LoadingState } from "@/components/ui/states";

function LatestMeasurement({ assessments }: { assessments: AnthropometricAssessment[] }) {
  if (assessments.length === 0) {
    return (
      <EmptyState
        title="No measurements yet"
        description="Your dietitian will record your height and weight at your next visit. They'll show up here."
      />
    );
  }

  const latest = assessments[0];
  const change = weightChange(assessments);

  return (
    <Card>
      <Text className="font-body text-xs uppercase tracking-wide text-body">
        Last recorded {formatDate(latest.date)}
      </Text>

      <View className="mt-3 flex-row gap-4">
        <View className="flex-1">
          <Text className="font-heading-bold text-3xl text-heading">{latest.domainData.weight.toFixed(1)}</Text>
          <Text className="font-body text-sm text-body">kg</Text>
        </View>
        <View className="flex-1">
          <Text className="font-heading-bold text-3xl text-heading">{latest.domainData.bmi.toFixed(1)}</Text>
          <Text className="font-body text-sm text-body">BMI · {bmiCategory(latest.domainData.bmi)}</Text>
        </View>
      </View>

      {change !== null ? (
        <Text className="mt-3 font-body-medium text-sm text-primary-dark">{formatWeightChange(change)}</Text>
      ) : null}
    </Card>
  );
}

function DietitianCard({ dietitian }: { dietitian: LinkedDietitian | null }) {
  if (!dietitian) {
    return (
      <Card>
        <Text className="font-heading text-base text-heading">No dietitian linked yet</Text>
        <Text className="mt-1 font-body text-sm text-body">
          Once a dietitian invites you, their details will appear here.
        </Text>
      </Card>
    );
  }

  return (
    <Card flush className="px-5">
      <LinkRow
        label={dietitian.name}
        description={dietitian.dietitianProfile?.specialty ?? "Your dietitian"}
        icon={Stethoscope}
        onPress={() => router.push("/(app)/dietitian")}
        last
      />
    </Card>
  );
}

export default function Home() {
  const profile = useApiQuery<PatientProfile>("/auth/profile");
  const assessments = useApiQuery<AnthropometricAssessment[]>("/patient/assessments");
  const dietitian = useApiQuery<LinkedDietitian | null>("/patient/dietitian");

  const loading = profile.loading || assessments.loading || dietitian.loading;
  const refreshing = profile.refreshing || assessments.refreshing || dietitian.refreshing;
  const onRefresh = () => {
    profile.refetch();
    assessments.refetch();
    dietitian.refetch();
  };

  const firstName = profile.data?.name.split(" ")[0];

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
      <AppHeader title="DietHaven Consult" subtitle="Your Food, Your Medicine" />

      <ScrollView
        contentContainerClassName="gap-5 px-6 py-6"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {loading ? (
          <LoadingState />
        ) : (
          <>
            <View>
              <Text className="font-heading-bold text-2xl text-heading">
                {firstName ? `Hello, ${firstName}` : "Hello"}
              </Text>
              <Text className="font-body text-sm text-body">Here&apos;s where your care stands today.</Text>
            </View>

            <View className="gap-3">
              <Text className="font-heading text-base text-heading">Your latest measurement</Text>
              {assessments.error ? (
                <Banner tone="danger">{assessments.error}</Banner>
              ) : (
                <LatestMeasurement assessments={assessments.data ?? []} />
              )}
            </View>

            <View className="gap-3">
              <Text className="font-heading text-base text-heading">Your dietitian</Text>
              {dietitian.error ? (
                <Banner tone="danger">{dietitian.error}</Banner>
              ) : (
                <DietitianCard dietitian={dietitian.data} />
              )}
            </View>

            <Card flush className="px-5">
              <LinkRow
                label="View full progress"
                description="Weight and BMI history recorded by your dietitian"
                icon={TrendingUp}
                onPress={() => router.push("/(app)/(tabs)/progress")}
                last
              />
            </Card>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
