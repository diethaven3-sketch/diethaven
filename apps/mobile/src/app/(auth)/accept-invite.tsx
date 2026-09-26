import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { Pressable, Text } from "react-native";
import { acceptInviteSchema, validateWithSchema } from "@repo/types";
import { colors } from "@repo/ui-tokens";
import { apiFetch, ApiError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { Screen } from "@/components/screen";
import { DietitianCard } from "@/components/dietitian-card";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { ConsentBox } from "@/components/ui/consent-box";
import { Banner } from "@/components/ui/banner";

interface InvitePreview {
  email: string;
  dietitianName: string;
  expired: boolean;
}

const initialForm = {
  name: "",
  password: "",
  phone: "",
  dateOfBirth: "",
  sex: null as "MALE" | "FEMALE" | "OTHER" | null,
  contact: "",
};

export default function AcceptInvite() {
  const { login } = useAuth();
  const params = useLocalSearchParams<{ token?: string }>();
  const [token, setToken] = useState(params.token ?? "");
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

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

  const checkToken = async () => {
    setCheckError(null);
    setChecking(true);
    try {
      const res = await apiFetch<InvitePreview>(`/invites/${token.trim()}`);
      if (res.expired) {
        setCheckError("This invite has expired or was already used.");
        setPreview(null);
      } else {
        setPreview(res);
      }
    } catch (err) {
      setCheckError(err instanceof ApiError ? err.message : "Invite not found.");
      setPreview(null);
    } finally {
      setChecking(false);
    }
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
      phone: form.phone.trim() || undefined,
      contact: form.contact.trim() || undefined,
      consentAccepted: true,
    };

    const validation = validateWithSchema(acceptInviteSchema, payload);
    if (!validation.success) {
      setFieldErrors(validation.errors);
      setFormError(validation.firstError);
      return;
    }
    setFieldErrors({});

    setSubmitting(true);
    try {
      const { accessToken } = await apiFetch<{ accessToken: string }>(`/invites/${token.trim()}/accept`, {
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

  if (!preview) {
    return (
      <Screen>
        <Text className="font-heading-bold text-2xl text-heading">Enter your invite</Text>
        <Text className="font-body text-sm text-body">
          Your dietitian sent you an invite link or code — paste it below.
        </Text>
        {checkError ? <Banner tone="danger">{checkError}</Banner> : null}
        <TextField label="Invite code" value={token} onChangeText={setToken} autoCapitalize="none" autoCorrect={false} />
        <Button onPress={checkToken} loading={checking}>
          Continue
        </Button>
      </Screen>
    );
  }

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

      <Text className="font-heading-bold text-2xl text-heading">You&apos;re invited</Text>
      <Text className="font-body text-sm leading-5 text-muted">
        A dietitian invited you to DietHaven. Finish setting up your account to connect with them.
      </Text>

      <DietitianCard role="Inviting you" name={preview.dietitianName} />

      {formError ? <Banner tone="danger">{formError}</Banner> : null}

      <TextField label="Full name" value={form.name} onChangeText={update("name")} error={fieldErrors.name} autoCapitalize="words" />
      <TextField
        label="Password"
        value={form.password}
        onChangeText={update("password")}
        error={fieldErrors.password}
        secureTextEntry
      />
      <TextField label="Phone (optional)" value={form.phone} onChangeText={update("phone")} error={fieldErrors.phone} keyboardType="phone-pad" />
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
        onChange={update("sex")}
        error={fieldErrors.sex}
        options={[
          { value: "MALE", label: "Male" },
          { value: "FEMALE", label: "Female" },
          { value: "OTHER", label: "Other" },
        ]}
      />
      <TextField label="Contact address (optional)" value={form.contact} onChangeText={update("contact")} error={fieldErrors.contact} />

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
        Complete registration
      </Button>
    </Screen>
  );
}
