import { Injectable } from "@nestjs/common";
import type { AuditAction } from "database";
import { PrismaService } from "../prisma/prisma.service";

export interface AuditLogEntry {
  userId: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  log(entry: AuditLogEntry) {
    return this.prisma.auditLog.create({ data: entry });
  }
}
