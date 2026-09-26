import { useState } from "react";
import { Link, router } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { Pressable, Text } from "react-native";
import { loginSchema, validateWithSchema } from "@repo/types";
import { colors } from "@repo/ui-tokens";
import { apiFetch, ApiError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { Screen } from "@/components/screen";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { Banner } from "@/components/ui/banner";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
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
    setFormError(null);
    const validation = validateWithSchema(loginSchema, { email: email.trim(), password });
    if (!validation.success) {
      setFieldErrors(validation.errors);
      setFormError(validation.firstError);
      return;
    }
    setFieldErrors({});

    setSubmitting(true);
    try {
      const { accessToken } = await apiFetch<{ accessToken: string }>("/auth/login", {
        method: "POST",
        body: validation.data,
      });
      await login(accessToken);
      router.replace("/(app)/(tabs)/home");
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
        if (Object.keys(err.fieldErrors).length > 0) {
          setFieldErrors((prev) => ({ ...prev, ...err.fieldErrors }));
        }
      } else {
        setFormError("Something went wrong. Please try again.");
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

      <Text className="font-heading-bold text-2xl text-heading">Log in with password</Text>

      {formError ? <Banner tone="danger">{formError}</Banner> : null}

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
        label="Password"
        value={password}
        onChangeText={(text) => {
          setPassword(text);
          clearFieldError("password");
        }}
        error={fieldErrors.password}
        secureTextEntry
      />

      <Button onPress={onSubmit} loading={submitting}>
        Log in
      </Button>

      <Link href="/(auth)/forgot-password" className="text-center font-body-medium text-sm text-primary">
        Forgot password?
      </Link>
      <Link href="/(auth)/otp-login" className="text-center font-body-medium text-sm text-primary">
        Log in with a one-time code instead
      </Link>
    </Screen>
  );
}
