import { Body, Controller, Get, Param, Patch, Query } from "@nestjs/common";
import {
  listDietitiansQuerySchema,
  updateDietitianStatusSchema,
  type ListDietitiansQuery,
  type UpdateDietitianStatusInput,
} from "@repo/types";
import { Role } from "database";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser, type AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { AdminService } from "./admin.service";

@Controller("admin/dietitians")
@Roles(Role.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  list(@Query(new ZodValidationPipe(listDietitiansQuerySchema)) query: ListDietitiansQuery) {
    return this.adminService.listDietitians(query.status);
  }

  @Get(":id")
  getDetail(@CurrentUser() admin: AuthenticatedUser, @Param("id") id: string) {
    return this.adminService.getDietitianDetail(admin.id, id);
  }

  @Patch(":id/status")
  updateStatus(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateDietitianStatusSchema)) dto: UpdateDietitianStatusInput,
  ) {
    return this.adminService.updateDietitianStatus(id, dto);
  }
}
