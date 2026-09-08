import { useState } from "react";
import { router } from "expo-router";
import { ScrollView, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { updatePatientProfileSchema, updateProfileSchema } from "@repo/types";
import { apiFetch, ApiError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { useApiQuery } from "@/lib/use-api";
import { toDateInput, type PatientClinicalProfile, type PatientProfile } from "@/lib/patient-data";
import { AppHeader } from "@/components/app-header";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
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

  const onSubmit = async () => {
    setFormError(null);

    const parsedAccount = updateProfileSchema.safeParse({ name, phone });
    const parsedClinical = updatePatientProfileSchema.safeParse({ dateOfBirth, sex, contact });

    if (!parsedAccount.success || !parsedClinical.success) {
      const errors: Record<string, string> = {};
      for (const issue of [
        ...(parsedAccount.success ? [] : parsedAccount.error.issues),
        ...(parsedClinical.success ? [] : parsedClinical.error.issues),
      ]) {
        errors[String(issue.path[0])] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    setSubmitting(true);
    try {
      // Two endpoints because the account fields live on User and the personal
      // details on PatientProfile. Account first, so a validation failure on the
      // clinical half doesn't leave the name half unsaved without explanation.
      await apiFetch("/auth/profile", { method: "PATCH", token, body: parsedAccount.data });
      await apiFetch("/patient/profile", { method: "PATCH", token, body: parsedClinical.data });
      router.back();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Couldn't save your changes. Please try again.");
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
        onChangeText={setName}
        error={fieldErrors.name}
        autoCapitalize="words"
      />
      <TextField
        label="Phone"
        value={phone}
        onChangeText={setPhone}
        error={fieldErrors.phone}
        keyboardType="phone-pad"
      />

      <Text className="font-heading text-base text-heading">Personal details</Text>
      <TextField
        label="Date of birth"
        placeholder="YYYY-MM-DD"
        value={dateOfBirth}
        onChangeText={setDateOfBirth}
        error={fieldErrors.dateOfBirth}
        keyboardType="numbers-and-punctuation"
      />
      <SegmentedControl
        label="Sex"
        value={sex}
        onChange={setSex}
        options={[
          { value: "MALE", label: "Male" },
          { value: "FEMALE", label: "Female" },
          { value: "OTHER", label: "Other" },
        ]}
      />
      <TextField label="Contact address" value={contact} onChangeText={setContact} error={fieldErrors.contact} />

      <Text className="font-body text-sm text-body">
        Your email address and your measurements are managed by your dietitian. Contact them if either needs to change.
      </Text>

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
      <AppHeader title="Edit profile" back />

      <ScrollView contentContainerClassName="gap-5 px-6 py-6" keyboardShouldPersistTaps="handled">
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
