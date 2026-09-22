import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppHeader } from "@/components/app-header";

const SECTIONS = [
  {
    title: "Data we collect",
    body: "We collect the health and personal information you and your dietitian enter, including anthropometric measurements, dietary intake, and consent records, in line with the NDPA 2023.",
  },
  {
    title: "How it's used",
    body: "Your data is used solely to support your nutrition care plan and is visible only to you and your linked dietitian.",
  },
  {
    title: "Your rights",
    body: "You may request a copy of your data or ask that it be corrected or deleted by contacting your dietitian or our support team.",
  },
  {
    title: "Data security",
    body: "All data is encrypted in transit and at rest, and every access to your clinical records is logged for audit purposes.",
  },
];

export default function PrivacyPolicy() {
  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
      <AppHeader title="Privacy policy" back />

      <ScrollView contentContainerClassName="gap-5 px-6 py-6">
        <Text className="font-body text-xs text-muted">Last updated 12 August 2026</Text>

        {SECTIONS.map((section) => (
          <View key={section.title} className="gap-1.5">
            <Text className="font-heading-bold text-[15px] text-heading">{section.title}</Text>
            <Text className="font-body text-[13px] leading-6 text-muted">{section.body}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
