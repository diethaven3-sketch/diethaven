import { Controller, Get, Query } from "@nestjs/common";
import { auditLogsQuerySchema, type AuditLogsQuery } from "@repo/types";
import { Role } from "database";
import { Roles } from "../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { AuditLogService } from "./audit-log.service";

@Controller("admin/audit-logs")
@Roles(Role.ADMIN)
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  list(@Query(new ZodValidationPipe(auditLogsQuerySchema)) query: AuditLogsQuery) {
    return this.auditLogService.list(query);
  }
}
