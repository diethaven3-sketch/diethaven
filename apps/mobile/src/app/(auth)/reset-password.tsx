import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Text } from "react-native";
import { resetPasswordSchema } from "@repo/types";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Screen } from "@/components/screen";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { Banner } from "@/components/ui/banner";

export default function ResetPassword() {
  const params = useLocalSearchParams<{ email?: string; devResetCode?: string }>();
  const [email, setEmail] = useState(params.email ?? "");
  const [code, setCode] = useState(params.devResetCode ?? "");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    setError(null);
    const parsed = resetPasswordSchema.safeParse({ email, code, newPassword });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the code and new password.");
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch("/auth/reset-password", { method: "POST", body: parsed.data });
      setSuccess(true);
      setTimeout(() => router.replace("/(auth)/login"), 1200);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Invalid or expired code.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <Text className="font-heading-bold text-2xl text-heading">Reset password</Text>
      <Text className="font-body text-sm text-body">Enter the 6-digit code we sent and choose a new password.</Text>

      {error ? <Banner tone="danger">{error}</Banner> : null}
      {success ? <Banner tone="success">Password reset. Redirecting to log in…</Banner> : null}
      {params.devResetCode ? <Banner tone="info">Dev reset code: {params.devResetCode}</Banner> : null}

      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />
      <TextField label="Reset code" value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} />
      <TextField label="New password" value={newPassword} onChangeText={setNewPassword} secureTextEntry />

      <Button onPress={onSubmit} loading={submitting}>
        Reset password
      </Button>
    </Screen>
  );
}
