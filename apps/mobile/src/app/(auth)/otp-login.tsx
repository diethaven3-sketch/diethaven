import { useState } from "react";
import { router } from "expo-router";
import { Text } from "react-native";
import { otpRequestSchema } from "@repo/types";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Screen } from "@/components/screen";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { Banner } from "@/components/ui/banner";

export default function OtpLogin() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    setError(null);
    const parsed = otpRequestSchema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter a valid email.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch<{ message: string; devOtp?: string }>("/auth/otp/request", {
        method: "POST",
        body: parsed.data,
      });
      router.push({ pathname: "/(auth)/otp-verify", params: { email, devOtp: res.devOtp } });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <Text className="font-heading-bold text-2xl text-heading">Log in with a code</Text>
      <Text className="font-body text-sm text-body">We&apos;ll send a one-time code to your email.</Text>

      {error ? <Banner tone="danger">{error}</Banner> : null}

      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />

      <Button onPress={onSubmit} loading={submitting}>
        Send code
      </Button>
    </Screen>
  );
}
