import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Trash2 } from "lucide-react-native";
import {
  FULLNESS_LABELS,
  HUNGER_LABELS,
  MEAL_TYPES_FOR_LOGGING,
  MEAL_TYPE_LABELS,
  foodLogCreateSchema,
  type FoodLogItem,
  type MealType,
} from "@repo/types";
import { apiFetch, ApiError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { useApiQuery } from "@/lib/use-api";
import type { FoodExchangeItem, FoodLogEntry } from "@/lib/food-log";
import { AppHeader } from "@/components/app-header";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TextField } from "@/components/ui/text-field";
import { LoadingState } from "@/components/ui/states";

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      className={`min-h-[40px] items-center justify-center rounded-full border px-4 py-2 ${
        selected ? "border-primary bg-surface-alt" : "border-gray-300 bg-white"
      }`}
    >
      <Text className={`font-body-medium text-sm ${selected ? "text-primary-dark" : "text-body"}`}>{label}</Text>
    </Pressable>
  );
}

function ScalePicker({
  label,
  labels,
  value,
  onChange,
}: {
  label: string;
  labels: Record<number, string>;
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  return (
    <View className="gap-1.5">
      <Text className="font-body-medium text-sm text-heading">{label}</Text>
      <View className="flex-row gap-2">
        {[1, 2, 3, 4, 5].map((level) => (
          <Pressable
            key={level}
            accessibilityRole="button"
            accessibilityLabel={labels[level]}
            accessibilityState={{ selected: value === level }}
            // Tapping the chosen level again clears it — this is optional feedback.
            onPress={() => onChange(value === level ? null : level)}
            className={`min-h-[44px] flex-1 items-center justify-center rounded-lg border ${
              value === level ? "border-primary bg-surface-alt" : "border-gray-300 bg-white"
            }`}
          >
            <Text className={`font-body-medium text-sm ${value === level ? "text-primary-dark" : "text-body"}`}>
              {level}
            </Text>
          </Pressable>
        ))}
      </View>
      {value ? <Text className="font-body text-xs text-body">{labels[value]}</Text> : null}
    </View>
  );
}

export default function LogMeal() {
  const { token } = useAuth();
  const params = useLocalSearchParams<{ id?: string }>();
  const editingId = params.id;

  const existing = useApiQuery<FoodLogEntry[]>("/food-logs");
  const foods = useApiQuery<FoodExchangeItem[]>("/food-exchange-items");

  const entry = editingId ? existing.data?.find((candidate) => candidate.id === editingId) : undefined;
  const ready = !existing.loading && (!editingId || entry !== undefined);

  if (!ready) {
    return (
      <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
        <AppHeader title={editingId ? "Edit entry" : "Log a meal"} back />
        <LoadingState />
      </SafeAreaView>
    );
  }

  return (
    <MealForm
      key={entry?.id ?? "new"}
      entry={entry}
      foods={foods.data ?? []}
      foodsError={foods.error}
      token={token}
    />
  );
}

function MealForm({
  entry,
  foods,
  foodsError,
  token,
}: {
  entry: FoodLogEntry | undefined;
  foods: FoodExchangeItem[];
  foodsError: string | null;
  token: string | null;
}) {
  const [mealType, setMealType] = useState<MealType>(entry?.mealType ?? "BREAKFAST");
  const [items, setItems] = useState<FoodLogItem[]>(entry?.items ?? []);
  const [description, setDescription] = useState(entry?.description ?? "");
  const [hungerBefore, setHungerBefore] = useState<number | null>(entry?.hungerBefore ?? null);
  const [fullnessAfter, setFullnessAfter] = useState<number | null>(entry?.fullnessAfter ?? null);
  const [symptoms, setSymptoms] = useState(entry?.symptoms ?? "");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const matches = search.trim()
    ? foods.filter((food) => food.foodName.toLowerCase().includes(search.trim().toLowerCase())).slice(0, 8)
    : [];

  const addFood = (food: FoodExchangeItem) => {
    setItems((current) => [
      ...current,
      {
        foodExchangeItemId: food.id,
        foodName: food.foodName,
        exchangeGroup: food.exchangeGroup,
        portionSize: food.portionSize,
        exchanges: 1,
      },
    ]);
    setSearch("");
  };

  const setExchanges = (index: number, delta: number) => {
    setItems((current) =>
      current.map((item, i) =>
        i === index ? { ...item, exchanges: Math.max(0.5, (item.exchanges ?? 1) + delta) } : item,
      ),
    );
  };

  const onSubmit = async () => {
    setError(null);

    const payload = {
      mealType,
      items,
      description: description.trim() || undefined,
      hungerBefore: hungerBefore ?? undefined,
      fullnessAfter: fullnessAfter ?? undefined,
      symptoms: symptoms.trim() || undefined,
    };

    const parsed = foodLogCreateSchema.safeParse(payload);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Add what you ate before saving.");
      return;
    }

    setSubmitting(true);
    try {
      if (entry) {
        await apiFetch(`/food-logs/${entry.id}`, {
          method: "PATCH",
          token,
          // Cleared text fields are sent as null so they are actually removed
          // rather than left at their previous value.
          body: {
            mealType,
            items,
            description: description.trim() || null,
            symptoms: symptoms.trim() || null,
            ...(hungerBefore ? { hungerBefore } : {}),
            ...(fullnessAfter ? { fullnessAfter } : {}),
          },
        });
      } else {
        await apiFetch("/food-logs", { method: "POST", token, body: parsed.data });
      }
      router.back();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save this entry. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = () => {
    if (!entry) return;
    Alert.alert("Delete entry", "This removes the entry from your diary.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await apiFetch(`/food-logs/${entry.id}`, { method: "DELETE", token });
            router.back();
          } catch (err) {
            setError(err instanceof ApiError ? err.message : "Couldn't delete this entry.");
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
      <AppHeader
        title={entry ? "Edit entry" : "Log a meal"}
        back
        right={
          entry ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Delete entry"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              onPress={onDelete}
            >
              <Trash2 size={20} color="white" />
            </Pressable>
          ) : null
        }
      />

      <ScrollView contentContainerClassName="gap-5 px-6 py-6" keyboardShouldPersistTaps="handled">
        {error ? <Banner tone="danger">{error}</Banner> : null}

        <View className="gap-1.5">
          <Text className="font-body-medium text-sm text-heading">Meal</Text>
          <View className="flex-row flex-wrap gap-2">
            {MEAL_TYPES_FOR_LOGGING.map((type) => (
              <Chip
                key={type}
                label={MEAL_TYPE_LABELS[type]}
                selected={mealType === type}
                onPress={() => setMealType(type)}
              />
            ))}
          </View>
        </View>

        <View className="gap-2">
          <TextField
            label="Search the food list"
            value={search}
            onChangeText={setSearch}
            placeholder="Yam, beans, rice…"
            autoCorrect={false}
          />
          {foodsError ? <Banner tone="warning">{foodsError}</Banner> : null}
          {matches.map((food) => (
            <Pressable
              key={food.id}
              accessibilityRole="button"
              accessibilityLabel={`Add ${food.foodName}`}
              onPress={() => addFood(food)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 active:bg-surface-alt"
            >
              <Text className="font-body-medium text-sm text-heading">{food.foodName}</Text>
              <Text className="font-body text-xs text-body">{food.portionSize}</Text>
            </Pressable>
          ))}
        </View>

        {items.length > 0 ? (
          <View className="gap-2">
            <Text className="font-body-medium text-sm text-heading">What you ate</Text>
            {items.map((item, index) => (
              <Card key={`${item.foodExchangeItemId ?? item.foodName}-${index}`} className="p-3">
                <View className="flex-row items-center justify-between gap-3">
                  <View className="flex-1">
                    <Text className="font-body-medium text-sm text-heading">{item.foodName}</Text>
                    <Text className="font-body text-xs text-body">{item.portionSize}</Text>
                  </View>
                  <View className="flex-row items-center gap-2">
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Fewer ${item.foodName}`}
                      onPress={() => setExchanges(index, -0.5)}
                      className="h-9 w-9 items-center justify-center rounded-lg border border-gray-300"
                    >
                      <Text className="font-body-medium text-base text-body">−</Text>
                    </Pressable>
                    <Text className="min-w-[2rem] text-center font-body-medium text-sm text-heading">
                      {item.exchanges}
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`More ${item.foodName}`}
                      onPress={() => setExchanges(index, 0.5)}
                      className="h-9 w-9 items-center justify-center rounded-lg border border-gray-300"
                    >
                      <Text className="font-body-medium text-base text-body">+</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${item.foodName}`}
                      onPress={() => setItems((current) => current.filter((_, i) => i !== index))}
                      className="h-9 w-9 items-center justify-center"
                    >
                      <Trash2 size={16} color="#9CA3AF" />
                    </Pressable>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        ) : null}

        <TextField
          label="Anything not on the list"
          value={description}
          onChangeText={setDescription}
          placeholder="Describe what you ate"
          multiline
          numberOfLines={3}
          className="min-h-[80px]"
        />

        <ScalePicker
          label="Hunger before (optional)"
          labels={HUNGER_LABELS}
          value={hungerBefore}
          onChange={setHungerBefore}
        />
        <ScalePicker
          label="Fullness after (optional)"
          labels={FULLNESS_LABELS}
          value={fullnessAfter}
          onChange={setFullnessAfter}
        />

        <TextField
          label="Symptoms (optional)"
          value={symptoms}
          onChangeText={setSymptoms}
          placeholder="Bloating, heartburn…"
        />

        <Button onPress={onSubmit} loading={submitting}>
          {entry ? "Save changes" : "Add to diary"}
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}
