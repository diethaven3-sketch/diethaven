import { useState } from "react";
import { router } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { Pressable, Text } from "react-native";
import { patientRegisterSchema } from "@repo/types";
import { colors } from "@repo/ui-tokens";
import { apiFetch, ApiError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { Screen } from "@/components/screen";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { ConsentBox } from "@/components/ui/consent-box";
import { Banner } from "@/components/ui/banner";

const initialForm = {
  name: "",
  email: "",
  password: "",
  phone: "",
  dateOfBirth: "",
  sex: null as "MALE" | "FEMALE" | "OTHER" | null,
  contact: "",
};

export default function Register() {
  const { login } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const update = (key: keyof typeof initialForm) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  const onSubmit = async () => {
    setFormError(null);

    if (!consentAccepted) {
      setFieldErrors({ consent: "You must accept the consent statement to continue." });
      return;
    }

    const parsed = patientRegisterSchema.safeParse({
      ...form,
      phone: form.phone || undefined,
      contact: form.contact || undefined,
      consentAccepted: true,
    });
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
      const { accessToken } = await apiFetch<{ accessToken: string }>("/auth/patient/register", {
        method: "POST",
        body: parsed.data,
      });
      await login(accessToken);
      router.replace("/(app)/(tabs)/home");
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
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

      <Text className="font-heading-bold text-2xl text-heading">Create your account</Text>
      <Text className="font-body text-sm text-muted">Tell us a bit about yourself to get started</Text>

      {formError ? <Banner tone="danger">{formError}</Banner> : null}

      <TextField label="Full name" value={form.name} onChangeText={update("name")} error={fieldErrors.name} autoCapitalize="words" />
      <TextField
        label="Email"
        value={form.email}
        onChangeText={update("email")}
        error={fieldErrors.email}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />
      <TextField
        label="Password"
        value={form.password}
        onChangeText={update("password")}
        error={fieldErrors.password}
        secureTextEntry
      />
      <TextField label="Phone (optional)" value={form.phone} onChangeText={update("phone")} keyboardType="phone-pad" />
      <TextField
        label="Date of birth"
        placeholder="YYYY-MM-DD"
        value={form.dateOfBirth}
        onChangeText={update("dateOfBirth")}
        error={fieldErrors.dateOfBirth}
        keyboardType="numbers-and-punctuation"
      />
      <SegmentedControl
        label="Sex"
        value={form.sex}
        onChange={(value) => setForm((f) => ({ ...f, sex: value }))}
        options={[
          { value: "MALE", label: "Male" },
          { value: "FEMALE", label: "Female" },
          { value: "OTHER", label: "Other" },
        ]}
      />
      <TextField label="Contact address (optional)" value={form.contact} onChangeText={update("contact")} />

      <ConsentBox
        label="I consent to DietHaven collecting and processing my health data in line with the NDPA 2023 for the purpose of my nutrition care."
        checked={consentAccepted}
        onChange={setConsentAccepted}
        error={fieldErrors.consent}
      />

      <Button onPress={onSubmit} loading={submitting}>
        Create account
      </Button>
    </Screen>
  );
}
