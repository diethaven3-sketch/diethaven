import { useState } from "react";
import { router } from "expo-router";
import { ArrowLeft, Check } from "lucide-react-native";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { changePasswordSchema } from "@repo/types";
import { colors } from "@repo/ui-tokens";
import { apiFetch, ApiError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";

const REQUIREMENTS: { label: string; test: (value: string) => boolean }[] = [
  { label: "At least 8 characters", test: (value) => value.length >= 8 },
  { label: "One uppercase letter", test: (value) => /[A-Z]/.test(value) },
  { label: "One number", test: (value) => /\d/.test(value) },
];

function RequirementRow({ label, met }: { label: string; met: boolean }) {
  return (
    <View className="flex-row items-center gap-2">
      <Check size={14} color={met ? colors.primary : "#D1D5DB"} />
      <Text className={`font-body text-xs ${met ? "text-muted" : "text-gray-400"}`}>{label}</Text>
    </View>
  );
}

export default function ChangePassword() {
  const { token } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    setFormError(null);

    if (newPassword !== confirmPassword) {
      setFieldErrors({ confirmPassword: "The two passwords don't match." });
      return;
    }

    const parsed = changePasswordSchema.safeParse({ currentPassword, newPassword });
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        errors[String(issue.path[0])] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    setSubmitting(true);
    try {
      await apiFetch("/auth/change-password", { method: "POST", token, body: parsed.data });
      router.back();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Couldn't change your password. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
      <ScrollView contentContainerClassName="gap-5 px-6 py-6" keyboardShouldPersistTaps="handled">
        <View className="flex-row items-center gap-3">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={() => router.back()}
          >
            <ArrowLeft size={22} color={colors.textBody} />
          </Pressable>
          <Text className="font-heading-bold text-lg text-heading">Change password</Text>
        </View>

        <Text className="font-body text-sm text-muted">Choose a strong password you haven&apos;t used before.</Text>

        {formError ? <Banner tone="danger">{formError}</Banner> : null}

        <TextField
          label="Current password"
          value={currentPassword}
          onChangeText={setCurrentPassword}
          error={fieldErrors.currentPassword}
          secureTextEntry
        />
        <TextField
          label="New password"
          value={newPassword}
          onChangeText={setNewPassword}
          error={fieldErrors.newPassword}
          secureTextEntry
        />
        <TextField
          label="Confirm new password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          error={fieldErrors.confirmPassword}
          secureTextEntry
        />

        <View className="gap-2">
          {REQUIREMENTS.map((requirement) => (
            <RequirementRow key={requirement.label} label={requirement.label} met={requirement.test(newPassword)} />
          ))}
        </View>

        <Button onPress={onSubmit} loading={submitting}>
          Update password
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}
