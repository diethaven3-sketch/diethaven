import { useState } from "react";
import { router } from "expo-router";
import { ScrollView, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { changePasswordSchema } from "@repo/types";
import { apiFetch, ApiError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { AppHeader } from "@/components/app-header";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";

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
      <AppHeader title="Change password" back />

      <ScrollView contentContainerClassName="gap-5 px-6 py-6" keyboardShouldPersistTaps="handled">
        {formError ? <Banner tone="danger">{formError}</Banner> : null}

        <Text className="font-body text-sm text-body">Choose a password of at least 8 characters.</Text>

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

        <Button onPress={onSubmit} loading={submitting}>
          Update password
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}
