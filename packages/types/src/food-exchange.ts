import { z } from "zod";

export const exchangeGroupSchema = z.enum(
  ["STARCHES", "LEGUMES", "VEGETABLES", "FRUITS", "FATS", "PROTEINS"],
  {
    message: "Please select a valid exchange group",
  },
);
export type ExchangeGroup = z.infer<typeof exchangeGroupSchema>;

export const foodExchangeItemCreateSchema = z.object({
  foodName: z
    .string({ message: "Food name is required" })
    .trim()
    .min(1, "Food name is required")
    .max(200, "Food name is too long"),
  exchangeGroup: exchangeGroupSchema,
  portionSize: z
    .string({ message: "Portion size is required" })
    .trim()
    .min(1, "Portion size is required")
    .max(100, "Portion size is too long"),
  calories: z
    .number({ message: "Calories must be a number" })
    .nonnegative("Calories cannot be negative")
    .max(10000, "Calories value is too large")
    .optional(),
  carbsG: z
    .number({ message: "Carbohydrates must be a number" })
    .nonnegative("Carbohydrates cannot be negative")
    .max(1000, "Carbohydrates value is too large")
    .optional(),
  proteinG: z
    .number({ message: "Protein must be a number" })
    .nonnegative("Protein cannot be negative")
    .max(1000, "Protein value is too large")
    .optional(),
  fatG: z
    .number({ message: "Fat must be a number" })
    .nonnegative("Fat cannot be negative")
    .max(1000, "Fat value is too large")
    .optional(),
});
export type FoodExchangeItemCreateInput = z.infer<typeof foodExchangeItemCreateSchema>;

export const foodExchangeItemUpdateSchema = foodExchangeItemCreateSchema.partial();
export type FoodExchangeItemUpdateInput = z.infer<typeof foodExchangeItemUpdateSchema>;

export const foodExchangeQuerySchema = z.object({
  exchangeGroup: exchangeGroupSchema.optional(),
});
export type FoodExchangeQuery = z.infer<typeof foodExchangeQuerySchema>;
