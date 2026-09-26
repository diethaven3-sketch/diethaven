import { useState } from "react";
import { router } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { updatePatientProfileSchema, updateProfileSchema, validateWithSchema } from "@repo/types";
import { colors } from "@repo/ui-tokens";
import { apiFetch, ApiError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { useApiQuery } from "@/lib/use-api";
import { toDateInput, type PatientClinicalProfile, type PatientProfile } from "@/lib/patient-data";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Note } from "@/components/ui/note";
import { TextField } from "@/components/ui/text-field";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { LoadingState } from "@/components/ui/states";

type Sex = PatientClinicalProfile["sex"];

/**
 * Split out so the form's state is seeded from the loaded profiles on mount,
 * rather than synced into state by an effect once the fetches resolve.
 */
function EditProfileForm({ account, clinical }: { account: PatientProfile; clinical: PatientClinicalProfile }) {
  const { token } = useAuth();
  const [name, setName] = useState(account.name);
  const [phone, setPhone] = useState(account.phone ?? "");
  const [dateOfBirth, setDateOfBirth] = useState(toDateInput(clinical.dateOfBirth));
  const [sex, setSex] = useState<Sex>(clinical.sex);
  const [contact, setContact] = useState(clinical.contact ?? "");
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

    const valAccount = validateWithSchema(updateProfileSchema, {
      name: name.trim() || undefined,
      phone: phone.trim() || undefined,
    });
    const valClinical = validateWithSchema(updatePatientProfileSchema, {
      dateOfBirth: dateOfBirth.trim() || undefined,
      sex: sex ?? undefined,
      contact: contact.trim() || undefined,
    });

    if (!valAccount.success || !valClinical.success) {
      const combinedErrors: Record<string, string> = {
        ...(valAccount.success ? {} : valAccount.errors),
        ...(valClinical.success ? {} : valClinical.errors),
      };
      setFieldErrors(combinedErrors);
      setFormError(valAccount.firstError ?? valClinical.firstError ?? "Please correct the form fields.");
      return;
    }
    setFieldErrors({});

    setSubmitting(true);
    try {
      await apiFetch("/auth/profile", { method: "PATCH", token, body: valAccount.data });
      await apiFetch("/patient/profile", { method: "PATCH", token, body: valClinical.data });
      router.back();
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
        if (Object.keys(err.fieldErrors).length > 0) {
          setFieldErrors((prev) => ({ ...prev, ...err.fieldErrors }));
        }
      } else {
        setFormError("Couldn't save your changes. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {formError ? <Banner tone="danger">{formError}</Banner> : null}

      <Text className="font-heading text-base text-heading">Account</Text>
      <TextField
        label="Full name"
        value={name}
        onChangeText={(text) => {
          setName(text);
          clearFieldError("name");
        }}
        error={fieldErrors.name}
        autoCapitalize="words"
      />
      <TextField
        label="Phone"
        value={phone}
        onChangeText={(text) => {
          setPhone(text);
          clearFieldError("phone");
        }}
        error={fieldErrors.phone}
        keyboardType="phone-pad"
      />

      <Text className="font-heading text-base text-heading">Personal details</Text>
      <TextField
        label="Date of birth"
        placeholder="YYYY-MM-DD"
        value={dateOfBirth}
        onChangeText={(text) => {
          setDateOfBirth(text);
          clearFieldError("dateOfBirth");
        }}
        error={fieldErrors.dateOfBirth}
        keyboardType="numbers-and-punctuation"
      />
      <SegmentedControl
        label="Sex"
        value={sex}
        onChange={(val) => {
          setSex(val);
          clearFieldError("sex");
        }}
        options={[
          { value: "MALE", label: "Male" },
          { value: "FEMALE", label: "Female" },
          { value: "OTHER", label: "Other" },
        ]}
      />
      <TextField
        label="Contact address"
        value={contact}
        onChangeText={(text) => {
          setContact(text);
          clearFieldError("contact");
        }}
        error={fieldErrors.contact}
      />

      <Note>
        Your email address and your measurements are managed by your dietitian. Changes to your contact details are
        shared with them.
      </Note>

      <Button onPress={onSubmit} loading={submitting}>
        Save changes
      </Button>
    </>
  );
}

export default function EditProfile() {
  const account = useApiQuery<PatientProfile>("/auth/profile");
  const clinical = useApiQuery<PatientClinicalProfile>("/patient/profile");

  const loading = account.loading || clinical.loading;
  const error = account.error ?? clinical.error;

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
      <ScrollView contentContainerClassName="gap-5 px-6 py-6" keyboardShouldPersistTaps="handled">
        <View className="flex-row items-center gap-3">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={() => router.back()}
          >
            <ArrowLeft size={22} color={colors.textBody} />
          </Pressable>
          <Text className="font-heading-bold text-lg text-heading">Edit personal info</Text>
        </View>

        {loading ? (
          <LoadingState />
        ) : error ? (
          <Banner tone="danger">{error}</Banner>
        ) : account.data && clinical.data ? (
          <EditProfileForm account={account.data} clinical={clinical.data} />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
