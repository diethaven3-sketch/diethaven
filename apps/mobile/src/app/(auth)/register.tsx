import { useState } from "react";
import { router } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { Pressable, Text } from "react-native";
import { patientRegisterSchema, validateWithSchema } from "@repo/types";
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

  const clearFieldError = (field: string) => {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const update = (key: keyof typeof initialForm) => (value: string | "MALE" | "FEMALE" | "OTHER" | null) => {
    setForm((f) => ({ ...f, [key]: value }));
    clearFieldError(key);
  };

  const onSubmit = async () => {
    setFormError(null);

    if (!consentAccepted) {
      setFieldErrors((prev) => ({ ...prev, consent: "You must accept the consent statement to continue." }));
      setFormError("You must accept the consent statement to continue.");
      return;
    }

    const payload = {
      ...form,
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || undefined,
      contact: form.contact.trim() || undefined,
      consentAccepted: true,
    };

    const validation = validateWithSchema(patientRegisterSchema, payload);
    if (!validation.success) {
      setFieldErrors(validation.errors);
      setFormError(validation.firstError);
      return;
    }
    setFieldErrors({});

    setSubmitting(true);
    try {
      const { accessToken } = await apiFetch<{ accessToken: string }>("/auth/patient/register", {
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

      <Text className="font-heading-bold text-2xl text-heading">Create your account</Text>
      <Text className="-mt-1 font-body text-sm text-body">Sign up as a patient to start tracking your nutrition.</Text>

      {formError ? <Banner tone="danger">{formError}</Banner> : null}

      <TextField
        label="Full name"
        value={form.name}
        onChangeText={update("name")}
        error={fieldErrors.name}
        autoCapitalize="words"
      />
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
        label="Password (min. 8 characters)"
        value={form.password}
        onChangeText={update("password")}
        error={fieldErrors.password}
        secureTextEntry
      />
      <TextField
        label="Phone (optional)"
        value={form.phone}
        onChangeText={update("phone")}
        error={fieldErrors.phone}
        keyboardType="phone-pad"
      />
      <TextField
        label="Date of birth (YYYY-MM-DD)"
        value={form.dateOfBirth}
        onChangeText={update("dateOfBirth")}
        error={fieldErrors.dateOfBirth}
        placeholder="YYYY-MM-DD"
      />

      <SegmentedControl
        label="Sex assigned at birth"
        options={[
          { value: "MALE", label: "Male" },
          { value: "FEMALE", label: "Female" },
          { value: "OTHER", label: "Other" },
        ]}
        value={form.sex}
        onChange={update("sex")}
        error={fieldErrors.sex}
      />

      <TextField
        label="Emergency contact (optional)"
        value={form.contact}
        onChangeText={update("contact")}
        error={fieldErrors.contact}
      />

      <ConsentBox
        label="I consent to DietHaven collecting and processing my health data in line with the NDPA 2023."
        checked={consentAccepted}
        onChange={(checked) => {
          setConsentAccepted(checked);
          clearFieldError("consent");
        }}
        error={fieldErrors.consent}
      />

      <Button onPress={onSubmit} loading={submitting}>
        Create account
      </Button>
    </Screen>
  );
}
