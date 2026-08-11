import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Text } from "react-native";
import { otpVerifySchema } from "@repo/types";
import { apiFetch, ApiError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { Screen } from "@/components/screen";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { Banner } from "@/components/ui/banner";

export default function OtpVerify() {
  const { login } = useAuth();
  const params = useLocalSearchParams<{ email?: string; devOtp?: string }>();
  const [email, setEmail] = useState(params.email ?? "");
  const [code, setCode] = useState(params.devOtp ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    setError(null);
    const parsed = otpVerifySchema.safeParse({ email, code });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter the 6-digit code.");
      return;
    }

    setSubmitting(true);
    try {
      const { accessToken } = await apiFetch<{ accessToken: string }>("/auth/otp/verify", {
        method: "POST",
        body: parsed.data,
      });
      await login(accessToken);
      router.replace("/(app)/home");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Invalid or expired code.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <Text className="font-heading-bold text-2xl text-heading">Enter your code</Text>
      <Text className="font-body text-sm text-body">Check your email for the 6-digit code.</Text>

      {error ? <Banner tone="danger">{error}</Banner> : null}
      {params.devOtp ? <Banner tone="info">Dev code: {params.devOtp}</Banner> : null}

      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />
      <TextField label="Code" value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} />

      <Button onPress={onSubmit} loading={submitting}>
        Verify
      </Button>
    </Screen>
  );
}
