import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import {
  foodExchangeItemCreateSchema,
  foodExchangeItemUpdateSchema,
  foodExchangeQuerySchema,
  type FoodExchangeItemCreateInput,
  type FoodExchangeItemUpdateInput,
  type FoodExchangeQuery,
} from "@repo/types";
import { Role } from "database";
import { Roles } from "../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { FoodExchangeService } from "./food-exchange.service";

@Controller("admin/food-exchange-items")
@Roles(Role.ADMIN)
export class FoodExchangeController {
  constructor(private readonly foodExchangeService: FoodExchangeService) {}

  @Get()
  list(@Query(new ZodValidationPipe(foodExchangeQuerySchema)) query: FoodExchangeQuery) {
    return this.foodExchangeService.list(query);
  }

  @Post()
  create(@Body(new ZodValidationPipe(foodExchangeItemCreateSchema)) dto: FoodExchangeItemCreateInput) {
    return this.foodExchangeService.create(dto);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(foodExchangeItemUpdateSchema)) dto: FoodExchangeItemUpdateInput,
  ) {
    return this.foodExchangeService.update(id, dto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.foodExchangeService.remove(id);
  }
}
