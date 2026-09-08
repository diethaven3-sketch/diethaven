import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import {
  followUpCreateSchema,
  followUpUpdateSchema,
  followUpsQuerySchema,
  type FollowUpCreateInput,
  type FollowUpUpdateInput,
  type FollowUpsQuery,
} from "@repo/types";
import { Role } from "database";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser, type AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { FollowUpsService } from "./follow-ups.service";

// Dietitian-only clinical data, like assessments, diagnoses and interventions.
@Controller("follow-ups")
@Roles(Role.DIETITIAN)
export class FollowUpsController {
  constructor(private readonly followUpsService: FollowUpsService) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(followUpCreateSchema)) dto: FollowUpCreateInput,
  ) {
    return this.followUpsService.create(user.id, dto);
  }

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(followUpsQuerySchema)) query: FollowUpsQuery,
  ) {
    return this.followUpsService.listForPatient(user.id, query.patientId);
  }

  @Patch(":id")
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(followUpUpdateSchema)) dto: FollowUpUpdateInput,
  ) {
    return this.followUpsService.update(user.id, id, dto);
  }
}
