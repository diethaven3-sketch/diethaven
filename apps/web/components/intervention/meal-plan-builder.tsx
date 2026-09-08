"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MEAL_TYPE_LABELS,
  MEAL_TYPE_ORDER,
  summariseMealPlan,
  type ExchangeGroup,
  type Meal,
  type MealItem,
  type MealPlanInput,
  type MealType,
} from "@repo/types";
import { apiFetch, ApiError } from "../../lib/api-client";
import { useAuth } from "../../lib/auth-context";
import { Button } from "../ui/button";
import { Banner } from "../ui/banner";
import { Badge } from "../ui/badge";
import { Field } from "../ui/input";
import { SelectField } from "../ui/select";

export interface FoodExchangeItem {
  id: string;
  foodName: string;
  exchangeGroup: ExchangeGroup;
  portionSize: string;
  calories: number | null;
  carbsG: number | null;
  proteinG: number | null;
  fatG: number | null;
}

/** Empty plan seeded with the three main meals, which almost every plan uses. */
export function emptyMealPlan(): MealPlanInput {
  return {
    name: "",
    meals: [
      { mealType: "BREAKFAST", items: [] },
      { mealType: "LUNCH", items: [] },
      { mealType: "DINNER", items: [] },
    ],
  };
}

function MealRow({
  meal,
  foods,
  onChange,
  onRemove,
}: {
  meal: Meal;
  foods: FoodExchangeItem[];
  onChange: (meal: Meal) => void;
  onRemove: () => void;
}) {
  const [foodId, setFoodId] = useState("");
  const [exchanges, setExchanges] = useState("1");

  const addItem = () => {
    const food = foods.find((candidate) => candidate.id === foodId);
    const count = Number(exchanges);
    if (!food || !Number.isFinite(count) || count <= 0) return;

    // Food details are copied onto the plan, so a later edit to the reference
    // list can't silently change what a patient was prescribed.
    const item: MealItem = {
      foodExchangeItemId: food.id,
      foodName: food.foodName,
      exchangeGroup: food.exchangeGroup,
      portionSize: food.portionSize,
      exchanges: count,
      ...(food.calories !== null ? { calories: food.calories } : {}),
      ...(food.carbsG !== null ? { carbsG: food.carbsG } : {}),
      ...(food.proteinG !== null ? { proteinG: food.proteinG } : {}),
      ...(food.fatG !== null ? { fatG: food.fatG } : {}),
    };
    onChange({ ...meal, items: [...meal.items, item] });
    setFoodId("");
    setExchanges("1");
  };

  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[10rem] flex-1">
          <SelectField
            label="Meal"
            name={`mealType-${meal.mealType}`}
            value={meal.mealType}
            onChange={(e) => onChange({ ...meal, mealType: e.target.value as MealType })}
          >
            {MEAL_TYPE_ORDER.map((type) => (
              <option key={type} value={type}>
                {MEAL_TYPE_LABELS[type]}
              </option>
            ))}
          </SelectField>
        </div>
        <div className="w-32">
          <Field
            label="Time"
            type="time"
            name={`time-${meal.mealType}`}
            value={meal.time ?? ""}
            onChange={(e) => onChange({ ...meal, time: e.target.value })}
          />
        </div>
        <Button type="button" variant="ghost" onClick={onRemove}>
          Remove meal
        </Button>
      </div>

      {meal.items.length > 0 ? (
        <ul className="mt-3 flex flex-col gap-2">
          {meal.items.map((item, index) => (
            <li
              key={`${item.foodExchangeItemId}-${index}`}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface px-3 py-2 text-sm"
            >
              <span className="text-heading">
                {item.exchanges} × {item.foodName}
                <span className="text-body"> ({item.portionSize})</span>
              </span>
              <span className="flex items-center gap-2">
                <Badge tone="neutral">{item.exchangeGroup}</Badge>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onChange({ ...meal, items: meal.items.filter((_, i) => i !== index) })}
                >
                  Remove
                </Button>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-body">No foods added to this meal yet.</p>
      )}

      <div className="mt-3 flex flex-wrap items-end gap-3">
        <div className="min-w-[14rem] flex-1">
          <SelectField
            label="Add food from the exchange list"
            name={`food-${meal.mealType}`}
            value={foodId}
            onChange={(e) => setFoodId(e.target.value)}
          >
            <option value="">Select a food…</option>
            {foods.map((food) => (
              <option key={food.id} value={food.id}>
                {food.foodName} — {food.portionSize} ({food.exchangeGroup.toLowerCase()})
              </option>
            ))}
          </SelectField>
        </div>
        <div className="w-28">
          <Field
            label="Exchanges"
            type="number"
            min="0.5"
            step="0.5"
            name={`exchanges-${meal.mealType}`}
            value={exchanges}
            onChange={(e) => setExchanges(e.target.value)}
          />
        </div>
        <Button type="button" variant="outline" onClick={addItem} disabled={!foodId}>
          Add
        </Button>
      </div>
    </div>
  );
}

export function MealPlanBuilder({ value, onChange }: { value: MealPlanInput; onChange: (plan: MealPlanInput) => void }) {
  const { token } = useAuth();
  const [foods, setFoods] = useState<FoodExchangeItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<FoodExchangeItem[]>("/food-exchange-items", { token })
      .then(setFoods)
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "Failed to load the food exchange list."));
  }, [token]);

  const totals = useMemo(() => summariseMealPlan(value.meals), [value.meals]);

  const setMeal = (index: number, meal: Meal) => {
    onChange({ ...value, meals: value.meals.map((existing, i) => (i === index ? meal : existing)) });
  };

  const addMeal = () => {
    const used = new Set(value.meals.map((meal) => meal.mealType));
    const next = MEAL_TYPE_ORDER.find((type) => !used.has(type)) ?? "MORNING_SNACK";
    onChange({ ...value, meals: [...value.meals, { mealType: next, items: [] }] });
  };

  return (
    <div className="flex flex-col gap-4">
      {loadError ? <Banner tone="danger">{loadError}</Banner> : null}
      {!loadError && foods.length === 0 ? (
        <Banner tone="warning">
          The Nigerian Food Exchange List is empty. An administrator needs to add items before meal plans can be built
          from it.
        </Banner>
      ) : null}

      <Field
        label="Plan name"
        name="mealPlanName"
        value={value.name}
        onChange={(e) => onChange({ ...value, name: e.target.value })}
        placeholder="1800 kcal exchange plan"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field
          label="Energy target (kcal)"
          type="number"
          name="calorieTarget"
          value={value.calorieTarget ?? ""}
          onChange={(e) => onChange({ ...value, calorieTarget: e.target.value ? Number(e.target.value) : undefined })}
        />
        <Field
          label="Carbohydrate (g)"
          type="number"
          name="carbsTargetG"
          value={value.carbsTargetG ?? ""}
          onChange={(e) => onChange({ ...value, carbsTargetG: e.target.value ? Number(e.target.value) : undefined })}
        />
        <Field
          label="Protein (g)"
          type="number"
          name="proteinTargetG"
          value={value.proteinTargetG ?? ""}
          onChange={(e) => onChange({ ...value, proteinTargetG: e.target.value ? Number(e.target.value) : undefined })}
        />
        <Field
          label="Fat (g)"
          type="number"
          name="fatTargetG"
          value={value.fatTargetG ?? ""}
          onChange={(e) => onChange({ ...value, fatTargetG: e.target.value ? Number(e.target.value) : undefined })}
        />
      </div>

      <div className="flex flex-col gap-3">
        {value.meals.map((meal, index) => (
          <MealRow
            key={`${meal.mealType}-${index}`}
            meal={meal}
            foods={foods}
            onChange={(next) => setMeal(index, next)}
            onRemove={() => onChange({ ...value, meals: value.meals.filter((_, i) => i !== index) })}
          />
        ))}
      </div>

      <Button type="button" variant="outline" onClick={addMeal} className="self-start">
        Add another meal
      </Button>

      <div className="rounded-lg bg-surface-alt p-4 text-sm">
        <p className="font-medium text-primary-dark">Plan totals from the exchange list</p>
        <p className="mt-1 text-body">
          {totals.exchanges} exchanges · {totals.calories} kcal · {totals.carbsG} g carbs · {totals.proteinG} g protein
          · {totals.fatG} g fat
        </p>
        <p className="mt-1 text-xs text-body">
          Totalled from the macronutrients recorded against each exchange item. Items with no macros recorded
          contribute nothing, so check against the targets above rather than treating this as exact.
        </p>
      </div>
    </div>
  );
}
