import { z } from "zod";
import { exchangeGroupSchema } from "./food-exchange";

export const interventionStatusSchema = z.enum(["DRAFT", "ACTIVE", "COMPLETED", "DISCONTINUED"]);
export type InterventionStatus = z.infer<typeof interventionStatusSchema>;

export const INTERVENTION_STATUS_LABELS: Record<InterventionStatus, string> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  COMPLETED: "Completed",
  DISCONTINUED: "Discontinued",
};

export const mealTypeSchema = z.enum([
  "BREAKFAST",
  "MORNING_SNACK",
  "LUNCH",
  "AFTERNOON_SNACK",
  "DINNER",
  "EVENING_SNACK",
]);
export type MealType = z.infer<typeof mealTypeSchema>;

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  BREAKFAST: "Breakfast",
  MORNING_SNACK: "Morning snack",
  LUNCH: "Lunch",
  AFTERNOON_SNACK: "Afternoon snack",
  DINNER: "Dinner",
  EVENING_SNACK: "Evening snack",
};

/** Meal order through the day, for rendering and for sorting a saved plan. */
export const MEAL_TYPE_ORDER: MealType[] = [
  "BREAKFAST",
  "MORNING_SNACK",
  "LUNCH",
  "AFTERNOON_SNACK",
  "DINNER",
  "EVENING_SNACK",
];

/**
 * One exchange-list selection within a meal. The food's details are copied in
 * alongside its id, so editing or deleting the reference item later cannot
 * silently rewrite a plan a patient is already following.
 */
export const mealItemSchema = z.object({
  foodExchangeItemId: z.string().min(1),
  foodName: z.string().min(1).max(200),
  exchangeGroup: exchangeGroupSchema,
  portionSize: z.string().min(1).max(100),
  /** Number of exchanges of this food, e.g. 2 × "1 medium yam slice". */
  exchanges: z.number().positive().max(50),
  calories: z.number().nonnegative().optional(),
  carbsG: z.number().nonnegative().optional(),
  proteinG: z.number().nonnegative().optional(),
  fatG: z.number().nonnegative().optional(),
});
export type MealItem = z.infer<typeof mealItemSchema>;

export const mealSchema = z.object({
  mealType: mealTypeSchema,
  /** Free-form clock time, e.g. "07:30". Optional — not every plan sets timing. */
  time: z.string().max(20).optional(),
  items: z.array(mealItemSchema).max(30),
  notes: z.string().trim().max(1000).optional(),
});
export type Meal = z.infer<typeof mealSchema>;

export const mealPlanSchema = z.object({
  name: z.string().trim().min(1, "Name the meal plan").max(200),
  meals: z.array(mealSchema).min(1, "Add at least one meal").max(10),
  calorieTarget: z.number().nonnegative().max(20000).optional(),
  carbsTargetG: z.number().nonnegative().max(2000).optional(),
  proteinTargetG: z.number().nonnegative().max(2000).optional(),
  fatTargetG: z.number().nonnegative().max(2000).optional(),
});
export type MealPlanInput = z.infer<typeof mealPlanSchema>;

/** The formal nutrition prescription (guideline §4.2.3). */
export const prescriptionSchema = z.object({
  energyKcal: z.number().nonnegative().max(20000).optional(),
  carbsG: z.number().nonnegative().max(2000).optional(),
  proteinG: z.number().nonnegative().max(2000).optional(),
  fatG: z.number().nonnegative().max(2000).optional(),
  fluidMl: z.number().nonnegative().max(20000).optional(),
  restrictions: z.string().trim().max(2000).optional(),
  supplements: z.string().trim().max(2000).optional(),
  notes: z.string().trim().max(2000).optional(),
});
export type Prescription = z.infer<typeof prescriptionSchema>;

export const interventionCreateSchema = z.object({
  patientId: z.string().min(1),
  /** Required: every intervention answers a specific accepted diagnosis. */
  diagnosisId: z.string().min(1, "Select the diagnosis this intervention addresses"),
  carePlanDetails: z.string().trim().min(1, "Describe the care plan").max(5000),
  prescription: prescriptionSchema.optional(),
  /** Created together with the intervention, in one transaction. */
  mealPlan: mealPlanSchema.optional(),
  status: interventionStatusSchema.optional(),
});
export type InterventionCreateInput = z.infer<typeof interventionCreateSchema>;

export const interventionUpdateSchema = z
  .object({
    carePlanDetails: z.string().trim().min(1).max(5000).optional(),
    prescription: prescriptionSchema.nullable().optional(),
    status: interventionStatusSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: "Nothing to update" });
export type InterventionUpdateInput = z.infer<typeof interventionUpdateSchema>;

export const interventionsQuerySchema = z.object({
  patientId: z.string().min(1),
  status: interventionStatusSchema.optional(),
});
export type InterventionsQuery = z.infer<typeof interventionsQuerySchema>;

/** Totals a meal plan's exchanges, for comparison against the targets set on it. */
export function summariseMealPlan(meals: Meal[]) {
  const totals = { calories: 0, carbsG: 0, proteinG: 0, fatG: 0, exchanges: 0 };
  for (const meal of meals) {
    for (const item of meal.items) {
      totals.exchanges += item.exchanges;
      totals.calories += (item.calories ?? 0) * item.exchanges;
      totals.carbsG += (item.carbsG ?? 0) * item.exchanges;
      totals.proteinG += (item.proteinG ?? 0) * item.exchanges;
      totals.fatG += (item.fatG ?? 0) * item.exchanges;
    }
  }
  return {
    calories: Math.round(totals.calories),
    carbsG: Math.round(totals.carbsG),
    proteinG: Math.round(totals.proteinG),
    fatG: Math.round(totals.fatG),
    exchanges: Math.round(totals.exchanges * 10) / 10,
  };
}
