import { useEffect, useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, CircleAlert } from "lucide-react-native";
import { Pressable, Text, TextInput, View } from "react-native";
import { otpRequestSchema, otpVerifySchema } from "@repo/types";
import { colors } from "@repo/ui-tokens";
import { apiFetch, ApiError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { Screen } from "@/components/screen";
import { Button } from "@/components/ui/button";

const RESEND_SECONDS = 30;

export default function OtpVerify() {
  const { login } = useAuth();
  const params = useLocalSearchParams<{ email?: string; devOtp?: string }>();
  const email = params.email ?? "";
  const [digits, setDigits] = useState<string[]>(() => {
    const seed = (params.devOtp ?? "").split("").slice(0, 6);
    return Array.from({ length: 6 }, (_, i) => seed[i] ?? "");
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resendIn, setResendIn] = useState(RESEND_SECONDS);
  const [resending, setResending] = useState(false);
  const inputs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const code = digits.join("");

  const setDigit = (index: number, value: string) => {
    const char = value.slice(-1).replace(/[^0-9]/g, "");
    setDigits((current) => {
      const next = [...current];
      next[index] = char;
      return next;
    });
    if (char && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const onKeyPress = (index: number, key: string) => {
    if (key === "Backspace" && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

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
      router.replace("/(app)/(tabs)/home");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "That code isn't right. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const onResend = async () => {
    const parsed = otpRequestSchema.safeParse({ email });
    if (!parsed.success) return;
    setResending(true);
    try {
      await apiFetch("/auth/otp/request", { method: "POST", body: parsed.data });
      setResendIn(RESEND_SECONDS);
      setDigits(Array(6).fill(""));
      setError(null);
      inputs.current[0]?.focus();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't resend the code. Please try again.");
    } finally {
      setResending(false);
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
        <Text className="font-heading-bold text-2xl text-heading">Enter verification code</Text>
        <Text className="font-body text-sm text-muted">
          {email ? `We sent a 6-digit code to ${email}` : "We sent a 6-digit code to your email"}
        </Text>
      </View>

      {error ? (
        <View className="flex-row items-center gap-1.5">
          <CircleAlert size={14} color={colors.danger} />
          <Text className="font-body-medium text-xs text-danger">{error}</Text>
        </View>
      ) : null}

      <View className="flex-row justify-between">
        {digits.map((digit, index) => (
          <TextInput
            key={index}
            ref={(el) => {
              inputs.current[index] = el;
            }}
            value={digit}
            onChangeText={(value) => setDigit(index, value)}
            onKeyPress={({ nativeEvent }) => onKeyPress(index, nativeEvent.key)}
            keyboardType="number-pad"
            maxLength={1}
            accessibilityLabel={`Digit ${index + 1}`}
            className={`h-14 w-12 rounded-lg border text-center font-heading-bold text-xl text-heading ${
              error ? "border-2 border-danger bg-red-50" : "border-gray-300 bg-white"
            }`}
          />
        ))}
      </View>

      <View className="flex-row items-center justify-center gap-1">
        <Text className="font-body text-[13px] text-muted">Didn&apos;t get a code?</Text>
        {resendIn > 0 ? (
          <Text className="font-body-medium text-[13px] text-primary">
            Resend in 0:{String(resendIn).padStart(2, "0")}
          </Text>
        ) : (
          <Pressable accessibilityRole="button" onPress={onResend} disabled={resending}>
            <Text className="font-body-medium text-[13px] text-primary">
              {resending ? "Resending…" : "Resend code"}
            </Text>
          </Pressable>
        )}
      </View>

      <Button onPress={onSubmit} loading={submitting}>
        Verify & continue
      </Button>
    </Screen>
  );
}
