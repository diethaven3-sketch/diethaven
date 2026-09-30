import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { inviteRequestSchema, type InviteRequestInput } from "@repo/types";
import { Role } from "database";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser, type AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { DietitianService } from "./dietitian.service";

@Controller("dietitian")
@Roles(Role.DIETITIAN)
export class DietitianController {
  constructor(private readonly dietitianService: DietitianService) {}

  @Get("me")
  getOwnProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.dietitianService.getOwnProfile(user.id);
  }

  @Get("overview")
  getOverview(@CurrentUser() user: AuthenticatedUser) {
    return this.dietitianService.getOverview(user.id);
  }

  @Get("patients")
  listPatients(@CurrentUser() user: AuthenticatedUser) {
    return this.dietitianService.listPatients(user.id);
  }

  @Get("patients/:id")
  getPatient(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.dietitianService.getPatient(user.id, id);
  }

  @Post("invites")
  requestInvite(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(inviteRequestSchema)) dto: InviteRequestInput,
  ) {
    return this.dietitianService.requestInvite(user.id, dto);
  }

  @Get("invites")
  listInvites(@CurrentUser() user: AuthenticatedUser) {
    return this.dietitianService.listInvites(user.id);
  }
}
