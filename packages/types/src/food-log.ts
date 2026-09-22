import { z } from "zod";
import { exchangeGroupSchema, type ExchangeGroup } from "./food-exchange";
import { mealTypeSchema, type Meal, type MealType } from "./intervention";

/**
 * A logged food. `foodExchangeItemId` is optional: patients can log something
 * that isn't on the exchange list, in which case only the name is recorded and
 * the entry can't count toward adherence.
 */
export const foodLogItemSchema = z.object({
  foodExchangeItemId: z.string().min(1).optional(),
  foodName: z.string().trim().min(1).max(200),
  exchangeGroup: exchangeGroupSchema.optional(),
  portionSize: z.string().max(100).optional(),
  exchanges: z.number().positive().max(50).optional(),
});
export type FoodLogItem = z.infer<typeof foodLogItemSchema>;

const feedbackScale = z.number().int().min(1).max(5).optional();

export const foodLogCreateSchema = z
  .object({
    /** Defaults to now when omitted; patients can back-date a missed entry. */
    date: z.string().datetime().optional(),
    mealType: mealTypeSchema,
    items: z.array(foodLogItemSchema).max(30).default([]),
    description: z.string().trim().max(2000).optional(),
    hungerBefore: feedbackScale,
    fullnessAfter: feedbackScale,
    symptoms: z.string().trim().max(1000).optional(),
  })
  // An entry with neither foods nor a description records nothing at all.
  .refine((value) => value.items.length > 0 || Boolean(value.description), {
    message: "Add at least one food, or describe what you ate",
    path: ["description"],
  });
export type FoodLogCreateInput = z.infer<typeof foodLogCreateSchema>;

export const foodLogUpdateSchema = z
  .object({
    mealType: mealTypeSchema.optional(),
    items: z.array(foodLogItemSchema).max(30).optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    hungerBefore: feedbackScale,
    fullnessAfter: feedbackScale,
    symptoms: z.string().trim().max(1000).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: "Nothing to update" });
export type FoodLogUpdateInput = z.infer<typeof foodLogUpdateSchema>;

export const foodLogsQuerySchema = z.object({
  /** Inclusive ISO dates bounding the range; both optional. */
  from: z.string().date().optional(),
  to: z.string().date().optional(),
});
export type FoodLogsQuery = z.infer<typeof foodLogsQuerySchema>;

export const patientFoodLogsQuerySchema = foodLogsQuerySchema.extend({
  patientId: z.string().min(1),
});
export type PatientFoodLogsQuery = z.infer<typeof patientFoodLogsQuerySchema>;

export const HUNGER_LABELS: Record<number, string> = {
  1: "Not hungry",
  2: "Slightly hungry",
  3: "Hungry",
  4: "Very hungry",
  5: "Ravenous",
};

export const FULLNESS_LABELS: Record<number, string> = {
  1: "Still hungry",
  2: "Slightly satisfied",
  3: "Satisfied",
  4: "Full",
  5: "Uncomfortably full",
};

// ---------------------------------------------------------------------------
// Adherence
// ---------------------------------------------------------------------------

interface FoodLogLike {
  date: string;
  items: FoodLogItem[];
}

export interface DayAdherence {
  /** ISO date, YYYY-MM-DD. */
  date: string;
  /** 0-100, or null when the day's entries carry no countable exchanges. */
  percent: number | null;
  entries: number;
  byGroup: { group: ExchangeGroup; planned: number; logged: number }[];
}

function exchangesByGroup(source: { exchangeGroup?: ExchangeGroup; exchanges?: number }[]) {
  const totals = new Map<ExchangeGroup, number>();
  for (const item of source) {
    if (!item.exchangeGroup || !item.exchanges) continue;
    totals.set(item.exchangeGroup, (totals.get(item.exchangeGroup) ?? 0) + item.exchanges);
  }
  return totals;
}

/** Daily exchange targets implied by a prescribed meal plan. */
export function plannedExchanges(meals: Meal[]) {
  return exchangesByGroup(meals.flatMap((meal) => meal.items));
}

/**
 * Percentage of the prescribed plan a day's logging accounts for.
 *
 * For each exchange group the plan asks for, credit is min(logged, planned) —
 * so eating double the starches cannot offset eating no vegetables — and the
 * result is the total credit over the total planned exchanges. A day with
 * nothing countable logged scores null rather than 0, because "no data" and
 * "followed none of the plan" are different things and must not look alike.
 *
 * This is a defensible working definition, NOT a validated clinical adherence
 * measure. It counts exchange quantities only: it knows nothing about timing,
 * food quality, or whether the patient simply logged badly.
 */
export function dayAdherence(planned: Map<ExchangeGroup, number>, logged: FoodLogItem[]): {
  percent: number | null;
  byGroup: DayAdherence["byGroup"];
} {
  const loggedTotals = exchangesByGroup(logged);
  const groups = new Set<ExchangeGroup>([...planned.keys(), ...loggedTotals.keys()]);

  const byGroup = [...groups]
    .map((group) => ({
      group,
      planned: Math.round((planned.get(group) ?? 0) * 10) / 10,
      logged: Math.round((loggedTotals.get(group) ?? 0) * 10) / 10,
    }))
    .sort((a, b) => a.group.localeCompare(b.group));

  const totalPlanned = [...planned.values()].reduce((sum, value) => sum + value, 0);
  if (totalPlanned === 0 || loggedTotals.size === 0) {
    return { percent: null, byGroup };
  }

  const credit = [...planned.entries()].reduce(
    (sum, [group, target]) => sum + Math.min(loggedTotals.get(group) ?? 0, target),
    0,
  );
  return { percent: Math.round((credit / totalPlanned) * 100), byGroup };
}

/** Per-day adherence across a range of logs, newest first. */
export function adherenceByDay(logs: FoodLogLike[], planned: Map<ExchangeGroup, number>): DayAdherence[] {
  const byDate = new Map<string, FoodLogLike[]>();
  for (const log of logs) {
    const date = log.date.slice(0, 10);
    byDate.set(date, [...(byDate.get(date) ?? []), log]);
  }

  return [...byDate.entries()]
    .map(([date, dayLogs]) => {
      const { percent, byGroup } = dayAdherence(
        planned,
        dayLogs.flatMap((log) => log.items),
      );
      return { date, percent, entries: dayLogs.length, byGroup };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

/** Mean adherence across the days that produced a score. */
export function averageAdherence(days: DayAdherence[]): number | null {
  const scored = days.filter((day): day is DayAdherence & { percent: number } => day.percent !== null);
  if (scored.length === 0) return null;
  return Math.round(scored.reduce((sum, day) => sum + day.percent, 0) / scored.length);
}

export const MEAL_TYPES_FOR_LOGGING: MealType[] = [
  "BREAKFAST",
  "MORNING_SNACK",
  "LUNCH",
  "AFTERNOON_SNACK",
  "DINNER",
  "EVENING_SNACK",
];
