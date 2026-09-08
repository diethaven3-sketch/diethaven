import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import {
  diagnosesQuerySchema,
  diagnosisCreateSchema,
  diagnosisUpdateSchema,
  type DiagnosesQuery,
  type DiagnosisCreateInput,
  type DiagnosisUpdateInput,
} from "@repo/types";
import { Role } from "database";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser, type AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { DiagnosesService } from "./diagnoses.service";

// Diagnosis is dietitian-only clinical data. Patients do not read it here, and
// admins never see patient clinical records at any milestone.
@Controller("diagnoses")
@Roles(Role.DIETITIAN)
export class DiagnosesController {
  constructor(private readonly diagnosesService: DiagnosesService) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(diagnosisCreateSchema)) dto: DiagnosisCreateInput,
  ) {
    return this.diagnosesService.create(user.id, dto);
  }

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(diagnosesQuerySchema)) query: DiagnosesQuery,
  ) {
    return this.diagnosesService.listForPatient(user.id, query.patientId, query.status);
  }

  @Patch(":id")
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(diagnosisUpdateSchema)) dto: DiagnosisUpdateInput,
  ) {
    return this.diagnosesService.update(user.id, id, dto);
  }
}
