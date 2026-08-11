import { z } from "zod";

export const exchangeGroupSchema = z.enum(["STARCHES", "LEGUMES", "VEGETABLES", "FRUITS", "FATS", "PROTEINS"]);
export type ExchangeGroup = z.infer<typeof exchangeGroupSchema>;

export const foodExchangeItemCreateSchema = z.object({
  foodName: z.string().min(1),
  exchangeGroup: exchangeGroupSchema,
  portionSize: z.string().min(1),
  calories: z.number().nonnegative().optional(),
  carbsG: z.number().nonnegative().optional(),
  proteinG: z.number().nonnegative().optional(),
  fatG: z.number().nonnegative().optional(),
});
export type FoodExchangeItemCreateInput = z.infer<typeof foodExchangeItemCreateSchema>;

export const foodExchangeItemUpdateSchema = foodExchangeItemCreateSchema.partial();
export type FoodExchangeItemUpdateInput = z.infer<typeof foodExchangeItemUpdateSchema>;

export const foodExchangeQuerySchema = z.object({
  exchangeGroup: exchangeGroupSchema.optional(),
});
export type FoodExchangeQuery = z.infer<typeof foodExchangeQuerySchema>;
