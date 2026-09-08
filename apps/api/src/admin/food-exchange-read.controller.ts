import { Controller, Get, Query } from "@nestjs/common";
import { foodExchangeQuerySchema, type FoodExchangeQuery } from "@repo/types";
import { Role } from "database";
import { Roles } from "../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { FoodExchangeService } from "./food-exchange.service";

/**
 * Read-only view of the Nigerian Food Exchange List for dietitians building
 * meal plans. The list is reference data, not patient data — admins still own
 * every write through /admin/food-exchange-items.
 */
@Controller("food-exchange-items")
@Roles(Role.DIETITIAN, Role.ADMIN)
export class FoodExchangeReadController {
  constructor(private readonly foodExchangeService: FoodExchangeService) {}

  @Get()
  list(@Query(new ZodValidationPipe(foodExchangeQuerySchema)) query: FoodExchangeQuery) {
    return this.foodExchangeService.list(query);
  }
}
