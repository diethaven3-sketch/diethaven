import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Text } from "react-native";
import { resetPasswordSchema, validateWithSchema } from "@repo/types";
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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const clearFieldError = (field: string) => {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const onSubmit = async () => {
    setError(null);
    const payload = {
      email: email.trim(),
      code: code.trim(),
      newPassword,
    };
    const validation = validateWithSchema(resetPasswordSchema, payload);
    if (!validation.success) {
      setFieldErrors(validation.errors);
      setError(validation.firstError);
      return;
    }
    setFieldErrors({});

    setSubmitting(true);
    try {
      await apiFetch("/auth/reset-password", { method: "POST", body: validation.data });
      setSuccess(true);
      setTimeout(() => router.replace("/(auth)/login"), 1200);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (Object.keys(err.fieldErrors).length > 0) {
          setFieldErrors((prev) => ({ ...prev, ...err.fieldErrors }));
        }
      } else {
        setError("Invalid or expired code.");
      }
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
        onChangeText={(text) => {
          setEmail(text);
          clearFieldError("email");
        }}
        error={fieldErrors.email}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />
      <TextField
        label="Reset code"
        value={code}
        onChangeText={(text) => {
          setCode(text);
          clearFieldError("code");
        }}
        error={fieldErrors.code}
        keyboardType="number-pad"
        maxLength={6}
      />
      <TextField
        label="New password"
        value={newPassword}
        onChangeText={(text) => {
          setNewPassword(text);
          clearFieldError("newPassword");
        }}
        error={fieldErrors.newPassword}
        secureTextEntry
      />

      <Button onPress={onSubmit} loading={submitting}>
        Reset password
      </Button>
    </Screen>
  );
}
