import { Controller, Get } from "@nestjs/common";
import { Role } from "database";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser, type AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { PatientService } from "./patient.service";

@Controller("patient")
@Roles(Role.PATIENT)
export class PatientController {
  constructor(private readonly patientService: PatientService) {}

  @Get("dietitian")
  getDietitian(@CurrentUser() user: AuthenticatedUser) {
    return this.patientService.getLinkedDietitian(user.id);
  }

  @Get("assessments")
  getAssessments(@CurrentUser() user: AuthenticatedUser) {
    return this.patientService.getOwnAssessments(user.id);
  }
}
