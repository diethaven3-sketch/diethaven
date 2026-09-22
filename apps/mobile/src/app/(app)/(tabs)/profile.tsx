import type { ReactNode } from "react";
import { router } from "expo-router";
import { Cake, FileText, KeyRound, LogOut, Pencil, Phone, ShieldCheck, Venus } from "lucide-react-native";
import { Alert, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@repo/ui-tokens";
import { useAuth } from "@/lib/auth-context";
import { useApiQuery } from "@/lib/use-api";
import {
  formatDate,
  sexLabel,
  type LinkedDietitian,
  type PatientClinicalProfile,
  type PatientProfile,
} from "@/lib/patient-data";
import { DietitianCard } from "@/components/dietitian-card";
import { Banner } from "@/components/ui/banner";
import { LinkRow } from "@/components/ui/link-row";
import { LoadingState } from "@/components/ui/states";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase();
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-1.5">
      <Text className="font-body-medium text-xs uppercase tracking-wide text-muted">{title}</Text>
      <View className="rounded-[22px] border border-gray-200 bg-white px-4">{children}</View>
    </View>
  );
}

export default function Profile() {
  const { logout } = useAuth();
  const account = useApiQuery<PatientProfile>("/auth/profile");
  const clinical = useApiQuery<PatientClinicalProfile>("/patient/profile");
  const dietitian = useApiQuery<LinkedDietitian | null>("/patient/dietitian");

  const loading = account.loading || clinical.loading;
  const refreshing = account.refreshing || clinical.refreshing || dietitian.refreshing;
  const onRefresh = () => {
    account.refetch();
    clinical.refetch();
    dietitian.refetch();
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
      <ScrollView
        contentContainerClassName="gap-5 px-5 pb-28 pt-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <Text className="font-heading-bold text-xl text-heading">Profile</Text>

        {loading ? (
          <LoadingState />
        ) : account.error ? (
          <Banner tone="danger">{account.error}</Banner>
        ) : account.data ? (
          <>
            <View className="flex-row items-center gap-3.5 rounded-[22px] border border-gray-200 bg-white p-4">
              <View className="h-14 w-14 items-center justify-center rounded-full bg-surface-alt">
                <Text className="font-heading-bold text-lg text-primary-dark">{initials(account.data.name)}</Text>
              </View>
              <View className="flex-1 gap-0.5">
                <Text className="font-heading-bold text-base text-heading">{account.data.name}</Text>
                <Text className="font-body text-xs text-muted">{account.data.email}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Edit profile"
                onPress={() => router.push("/(app)/edit-profile")}
                className="h-8 w-8 items-center justify-center rounded-full bg-surface-alt active:opacity-60"
              >
                <Pencil size={14} color={colors.primaryDark} />
              </Pressable>
            </View>

            {dietitian.data ? (
              <DietitianCard name={dietitian.data.name} onPress={() => router.push("/(app)/dietitian")} />
            ) : null}

            {clinical.data ? (
              <Section title="Personal information">
                <LinkRow
                  label="Phone number"
                  value={account.data.phone ?? "Not provided"}
                  icon={Phone}
                  onPress={() => router.push("/(app)/edit-profile")}
                />
                <LinkRow
                  label="Date of birth"
                  value={formatDate(clinical.data.dateOfBirth)}
                  icon={Cake}
                  onPress={() => router.push("/(app)/edit-profile")}
                />
                <LinkRow
                  label="Sex"
                  value={sexLabel(clinical.data.sex)}
                  icon={Venus}
                  onPress={() => router.push("/(app)/edit-profile")}
                  last
                />
              </Section>
            ) : null}

            <Section title="Privacy">
              {clinical.data ? (
                <LinkRow
                  label="Data consent"
                  value={
                    clinical.data.consentStatus
                      ? clinical.data.consentGivenAt
                        ? `Given · ${formatDate(clinical.data.consentGivenAt)}`
                        : "Given"
                      : "Not on record"
                  }
                  icon={ShieldCheck}
                  onPress={() => {}}
                  chevron={false}
                />
              ) : null}
              <LinkRow
                label="Privacy policy"
                icon={FileText}
                onPress={() => router.push("/(app)/privacy-policy")}
                last
              />
            </Section>

            <Section title="Account">
              <LinkRow
                label="Change password"
                icon={KeyRound}
                onPress={() => router.push("/(app)/change-password")}
              />
              <LinkRow label="Log out" icon={LogOut} onPress={onLogout} tone="danger" chevron={false} last />
            </Section>

            <Text className="text-center font-body text-[11px] text-muted">DietHaven Consult · v1.0</Text>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
