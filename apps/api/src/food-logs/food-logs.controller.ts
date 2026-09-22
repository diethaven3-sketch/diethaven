import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from "@nestjs/common";
import {
  foodLogCreateSchema,
  foodLogUpdateSchema,
  foodLogsQuerySchema,
  patientFoodLogsQuerySchema,
  type FoodLogCreateInput,
  type FoodLogUpdateInput,
  type FoodLogsQuery,
  type PatientFoodLogsQuery,
} from "@repo/types";
import { Role } from "database";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser, type AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { FoodLogsService } from "./food-logs.service";

/**
 * The patient's own diary. Per the guideline's Role Permission Matrix, logging
 * daily intake is a patient-only capability — every handler here is scoped to
 * the authenticated patient's own id, never a client-supplied one.
 */
@Controller("food-logs")
@Roles(Role.PATIENT)
export class FoodLogsController {
  constructor(private readonly foodLogsService: FoodLogsService) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(foodLogCreateSchema)) dto: FoodLogCreateInput,
  ) {
    return this.foodLogsService.createOwn(user.id, dto);
  }

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(foodLogsQuerySchema)) query: FoodLogsQuery,
  ) {
    return this.foodLogsService.listOwn(user.id, query);
  }

  @Patch(":id")
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(foodLogUpdateSchema)) dto: FoodLogUpdateInput,
  ) {
    return this.foodLogsService.updateOwn(user.id, id, dto);
  }

  @Delete(":id")
  @HttpCode(204)
  remove(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.foodLogsService.removeOwn(user.id, id);
  }
}

/**
 * Dietitian-side read of a linked patient's diary. Deliberately a separate
 * controller with its own role: keeping the patient's write endpoints and the
 * dietitian's read endpoint apart makes the boundary structural rather than a
 * branch inside one handler.
 */
@Controller("dietitian/food-logs")
@Roles(Role.DIETITIAN)
export class PatientFoodLogsController {
  constructor(private readonly foodLogsService: FoodLogsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(patientFoodLogsQuerySchema)) query: PatientFoodLogsQuery,
  ) {
    return this.foodLogsService.listForPatient(user.id, query.patientId, query);
  }
}
