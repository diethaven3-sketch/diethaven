import { RefreshControl, ScrollView, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@repo/ui-tokens";
import { useApiQuery } from "@/lib/use-api";
import type { LinkedDietitian } from "@/lib/patient-data";
import { AppHeader } from "@/components/app-header";
import { Card } from "@/components/ui/card";
import { Banner } from "@/components/ui/banner";
import { DetailRow } from "@/components/ui/detail-row";
import { EmptyState, LoadingState } from "@/components/ui/states";

export default function Dietitian() {
  const { data, error, loading, refreshing, refetch } = useApiQuery<LinkedDietitian | null>("/patient/dietitian");

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
      <AppHeader title="Your dietitian" back />

      <ScrollView
        contentContainerClassName="gap-5 px-6 py-6"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refetch} tintColor={colors.primary} />}
      >
        {loading ? (
          <LoadingState />
        ) : error ? (
          <Banner tone="danger">{error}</Banner>
        ) : !data ? (
          <EmptyState
            title="No dietitian linked yet"
            description="When a registered dietitian invites you to their care list, their contact details will appear here."
          />
        ) : (
          <>
            <Card>
              <Text className="font-heading-bold text-xl text-heading">{data.name}</Text>
              <Text className="font-body text-sm text-body">
                {data.dietitianProfile?.specialty ?? "Registered dietitian"}
              </Text>
            </Card>

            <Card>
              <Text className="mb-1 font-heading text-base text-heading">Contact</Text>
              <DetailRow label="Email" value={data.email} />
              <DetailRow label="Phone" value={data.phone} last />
            </Card>

            <Card>
              <Text className="mb-1 font-heading text-base text-heading">Practice</Text>
              <DetailRow label="Specialty" value={data.dietitianProfile?.specialty} />
              <DetailRow label="Facility" value={data.dietitianProfile?.facility} last />
            </Card>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
