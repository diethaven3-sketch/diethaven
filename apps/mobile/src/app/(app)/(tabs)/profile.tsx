import { router } from "expo-router";
import { Alert, RefreshControl, ScrollView, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { KeyRound, Pencil, Stethoscope } from "lucide-react-native";
import { colors } from "@repo/ui-tokens";
import { useAuth } from "@/lib/auth-context";
import { useApiQuery } from "@/lib/use-api";
import {
  formatDate,
  sexLabel,
  type PatientClinicalProfile,
  type PatientProfile,
} from "@/lib/patient-data";
import { AppHeader } from "@/components/app-header";
import { Card } from "@/components/ui/card";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { DetailRow } from "@/components/ui/detail-row";
import { LinkRow } from "@/components/ui/link-row";
import { LoadingState } from "@/components/ui/states";

export default function Profile() {
  const { logout } = useAuth();
  const account = useApiQuery<PatientProfile>("/auth/profile");
  const clinical = useApiQuery<PatientClinicalProfile>("/patient/profile");

  const loading = account.loading || clinical.loading;
  const refreshing = account.refreshing || clinical.refreshing;
  const onRefresh = () => {
    account.refetch();
    clinical.refetch();
  };

  const onLogout = () => {
    Alert.alert("Log out", "You'll need to sign in again to see your care details.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/(auth)/welcome");
        },
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
      <AppHeader title="Profile" />

      <ScrollView
        contentContainerClassName="gap-5 px-6 py-6"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {loading ? (
          <LoadingState />
        ) : account.error ? (
          <Banner tone="danger">{account.error}</Banner>
        ) : account.data ? (
          <>
            <Card>
              <Text className="font-heading-bold text-xl text-heading">{account.data.name}</Text>
              <Text className="font-body text-sm text-body">{account.data.email}</Text>
            </Card>

            <Card>
              <Text className="mb-1 font-heading text-base text-heading">Account</Text>
              <DetailRow label="Full name" value={account.data.name} />
              <DetailRow label="Email" value={account.data.email} />
              <DetailRow label="Phone" value={account.data.phone} />
              <DetailRow label="Member since" value={formatDate(account.data.createdAt)} last />
            </Card>

            <Card>
              <Text className="mb-1 font-heading text-base text-heading">Personal details</Text>
              {clinical.error ? (
                <Banner tone="danger">{clinical.error}</Banner>
              ) : clinical.data ? (
                <>
                  <DetailRow label="Date of birth" value={formatDate(clinical.data.dateOfBirth)} />
                  <DetailRow label="Sex" value={sexLabel(clinical.data.sex)} />
                  <DetailRow label="Contact address" value={clinical.data.contact} last />
                </>
              ) : null}
            </Card>

            <Card flush className="px-5">
              <LinkRow
                label="Edit profile"
                description="Update your name, phone, or personal details"
                icon={Pencil}
                onPress={() => router.push("/(app)/edit-profile")}
              />
              <LinkRow
                label="Change password"
                icon={KeyRound}
                onPress={() => router.push("/(app)/change-password")}
              />
              <LinkRow
                label="Your dietitian"
                icon={Stethoscope}
                onPress={() => router.push("/(app)/dietitian")}
                last
              />
            </Card>

            <Card>
              <Text className="mb-1 font-heading text-base text-heading">Consent &amp; your data</Text>
              {clinical.data ? (
                <DetailRow
                  label="Consent given"
                  value={
                    clinical.data.consentStatus
                      ? clinical.data.consentGivenAt
                        ? formatDate(clinical.data.consentGivenAt)
                        : "Yes"
                      : "Not on record"
                  }
                  last
                />
              ) : null}
              <Text className="mt-2 font-body text-sm text-body">
                You consented to DietHaven Consult processing your health data for your nutrition care under the NDPA
                2023. Only you and your linked dietitian can see your clinical records, and every access is logged. To
                withdraw consent, contact your dietitian.
              </Text>
            </Card>

            <Button variant="outline" onPress={onLogout}>
              Log out
            </Button>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
