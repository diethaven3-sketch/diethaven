import { Body, Controller, Get, Patch } from "@nestjs/common";
import { Role } from "database";
import { updatePatientProfileSchema, type UpdatePatientProfileInput } from "@repo/types";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser, type AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { PatientService } from "./patient.service";

@Controller("patient")
@Roles(Role.PATIENT)
export class PatientController {
  constructor(private readonly patientService: PatientService) {}

  @Get("dietitian")
  getDietitian(@CurrentUser() user: AuthenticatedUser) {
    return this.patientService.getLinkedDietitian(user.id);
  }

  // Every handler scopes to the authenticated user's own id — a patient has no
  // way to address another patient's profile through this controller.
  @Get("profile")
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.patientService.getOwnProfile(user.id);
  }

  @Patch("profile")
  updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(updatePatientProfileSchema)) dto: UpdatePatientProfileInput,
  ) {
    return this.patientService.updateOwnProfile(user.id, dto);
  }

  @Get("assessments")
  getAssessments(@CurrentUser() user: AuthenticatedUser) {
    return this.patientService.getOwnAssessments(user.id);
  }
}
