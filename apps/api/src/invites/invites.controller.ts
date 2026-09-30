import { Body, Controller, Get, HttpCode, Param, Post } from "@nestjs/common";
import { acceptInviteSchema, type AcceptInviteInput } from "@repo/types";
import { Public } from "../common/decorators/public.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { InvitesService } from "./invites.service";

@Controller("invites")
export class InvitesController {
  constructor(private readonly invitesService: InvitesService) {}

  @Public()
  @Get(":token")
  getInvite(@Param("token") token: string) {
    return this.invitesService.getInvite(token);
  }

  @Public()
  @Post(":token/verification")
  @HttpCode(200)
  sendVerification(@Param("token") token: string) {
    return this.invitesService.sendVerification(token);
  }

  @Public()
  @Post(":token/accept")
  acceptInvite(
    @Param("token") token: string,
    @Body(new ZodValidationPipe(acceptInviteSchema)) dto: AcceptInviteInput,
  ) {
    return this.invitesService.acceptInvite(token, dto);
  }
}
