import { useState } from "react";
import { router } from "expo-router";
import { Text } from "react-native";
import { forgotPasswordSchema, validateWithSchema } from "@repo/types";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Screen } from "@/components/screen";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { Banner } from "@/components/ui/banner";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
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
    const validation = validateWithSchema(forgotPasswordSchema, { email: email.trim() });
    if (!validation.success) {
      setFieldErrors(validation.errors);
      setError(validation.firstError);
      return;
    }
    setFieldErrors({});

    setSubmitting(true);
    try {
      const res = await apiFetch<{ message: string; devResetCode?: string }>("/auth/forgot-password", {
        method: "POST",
        body: validation.data,
      });
      setSent(true);
      router.push({ pathname: "/(auth)/reset-password", params: { email: email.trim(), devResetCode: res.devResetCode } });
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
      <Text className="font-heading-bold text-2xl text-heading">Forgot password</Text>
      <Text className="font-body text-sm text-body">
        Enter the email on your account and we&apos;ll send you a reset code.
      </Text>

      {error ? <Banner tone="danger">{error}</Banner> : null}
      {sent ? <Banner tone="success">If that account exists, a reset code has been sent.</Banner> : null}

      <TextField
        label="Email"
        value={email}
        onChangeText={(text) => {
          setEmail(text);
          clearFieldError("email");
          if (error) setError(null);
        }}
        error={fieldErrors.email}
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
