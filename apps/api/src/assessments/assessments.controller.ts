import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import {
  assessmentCreateSchema,
  assessmentsQuerySchema,
  type AssessmentCreateInput,
  type AssessmentsQuery,
} from "@repo/types";
import { Role } from "database";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser, type AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { AssessmentsService } from "./assessments.service";

@Controller("assessments")
@Roles(Role.DIETITIAN)
export class AssessmentsController {
  constructor(private readonly assessmentsService: AssessmentsService) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(assessmentCreateSchema)) dto: AssessmentCreateInput,
  ) {
    return this.assessmentsService.create(user.id, dto);
  }

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(assessmentsQuerySchema)) query: AssessmentsQuery,
  ) {
    return this.assessmentsService.listForPatient(user.id, query.patientId, query.domain);
  }
}
