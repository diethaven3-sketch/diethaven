import { Injectable } from "@nestjs/common";
import type { AuditLogsQuery } from "@repo/types";
import { PrismaService } from "../prisma/prisma.service";

const PAGE_SIZE = 25;

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: AuditLogsQuery) {
    const where = {
      entityType: query.entityType,
      action: query.action,
      userId: query.userId,
    };

    const [entries, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true, role: true } } },
        orderBy: { timestamp: "desc" },
        take: PAGE_SIZE,
        skip: (query.page - 1) * PAGE_SIZE,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { entries, total, page: query.page, pageSize: PAGE_SIZE };
  }
}
