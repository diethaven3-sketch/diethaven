import { useState } from "react";
import { router } from "expo-router";
import { Text } from "react-native";
import { forgotPasswordSchema } from "@repo/types";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Screen } from "@/components/screen";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { Banner } from "@/components/ui/banner";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    setError(null);
    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter a valid email.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch<{ message: string; devResetCode?: string }>("/auth/forgot-password", {
        method: "POST",
        body: parsed.data,
      });
      setSent(true);
      router.push({ pathname: "/(auth)/reset-password", params: { email, devResetCode: res.devResetCode } });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <Text className="font-heading-bold text-2xl text-heading">Forgot password</Text>
      <Text className="font-body text-sm text-body">
        Enter the email on your account and we&apos;ll send you a reset code.
      </Text>

      {error ? <Banner tone="danger">{error}</Banner> : null}
      {sent ? <Banner tone="success">If that account exists, a reset code has been sent.</Banner> : null}

      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />

      <Button onPress={onSubmit} loading={submitting}>
        Send reset code
      </Button>
    </Screen>
  );
}
