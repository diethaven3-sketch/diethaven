import { useState } from "react";
import { Link, router } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { otpRequestSchema, validateWithSchema } from "@repo/types";
import { colors } from "@repo/ui-tokens";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Screen } from "@/components/screen";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { Banner } from "@/components/ui/banner";

export default function OtpLogin() {
  const [email, setEmail] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
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
    const validation = validateWithSchema(otpRequestSchema, { email: email.trim() });
    if (!validation.success) {
      setFieldErrors(validation.errors);
      setError(validation.firstError);
      return;
    }
    setFieldErrors({});

    setSubmitting(true);
    try {
      const res = await apiFetch<{ message: string; devOtp?: string }>("/auth/otp/request", {
        method: "POST",
        body: validation.data,
      });
      router.push({ pathname: "/(auth)/otp-verify", params: { email: email.trim(), devOtp: res.devOtp } });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (Object.keys(err.fieldErrors).length > 0) {
          setFieldErrors((prev) => ({ ...prev, ...err.fieldErrors }));
        }
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        onPress={() => router.back()}
        className="-mb-2 self-start"
      >
        <ArrowLeft size={22} color={colors.textBody} />
      </Pressable>

      <View className="gap-1.5">
        <Text className="font-heading-bold text-2xl text-heading">Log in with email</Text>
        <Text className="font-body text-sm text-muted">
          We&apos;ll email you a one-time code — no password needed
        </Text>
      </View>

      {error ? <Banner tone="danger">{error}</Banner> : null}

      <TextField
        label="Email"
        value={email}
        onChangeText={(text) => {
          setEmail(text);
          clearFieldError("email");
          if (error) setError(null);
        }}
        error={fieldErrors.email}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />

      <Button onPress={onSubmit} loading={submitting}>
        Send code
      </Button>

      <View className="flex-row items-center justify-center gap-1">
        <Text className="font-body text-[13px] text-muted">New patient?</Text>
        <Link href="/(auth)/register" className="font-body-medium text-[13px] text-primary">
          Create an account
        </Link>
      </View>

      <Link href="/(auth)/login" className="text-center font-body-medium text-[13px] text-primary">
        Log in with a password instead
      </Link>
    </Screen>
  );
}
