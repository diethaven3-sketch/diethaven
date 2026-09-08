import { Body, Controller, Get, Param, Patch, Post, Put, Query } from "@nestjs/common";
import {
  interventionCreateSchema,
  interventionUpdateSchema,
  interventionsQuerySchema,
  mealPlanSchema,
  type InterventionCreateInput,
  type InterventionUpdateInput,
  type InterventionsQuery,
  type MealPlanInput,
} from "@repo/types";
import { Role } from "database";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser, type AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { InterventionsService } from "./interventions.service";

// Dietitian-only clinical data, like assessments and diagnoses.
@Controller("interventions")
@Roles(Role.DIETITIAN)
export class InterventionsController {
  constructor(private readonly interventionsService: InterventionsService) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(interventionCreateSchema)) dto: InterventionCreateInput,
  ) {
    return this.interventionsService.create(user.id, dto);
  }

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(interventionsQuerySchema)) query: InterventionsQuery,
  ) {
    return this.interventionsService.listForPatient(user.id, query.patientId, query.status);
  }

  @Patch(":id")
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(interventionUpdateSchema)) dto: InterventionUpdateInput,
  ) {
    return this.interventionsService.update(user.id, id, dto);
  }

  @Put(":id/meal-plan")
  setMealPlan(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(mealPlanSchema)) dto: MealPlanInput,
  ) {
    return this.interventionsService.setMealPlan(user.id, id, dto);
  }
}
