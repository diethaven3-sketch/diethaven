import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { FoodLogCreateInput, FoodLogUpdateInput, FoodLogsQuery, OwnFoodLogsQuery } from "@repo/types";
import type { Prisma } from "database";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";

@Injectable()
export class FoodLogsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * `to` is inclusive of the whole day, so a log at 19:00 on the end date is
   * returned rather than silently dropped by a midnight boundary.
   */
  private dateFilter(query: FoodLogsQuery): Prisma.DateTimeFilter | undefined {
    if (!query.from && !query.to) return undefined;
    const filter: Prisma.DateTimeFilter = {};
    if (query.from) filter.gte = new Date(`${query.from}T00:00:00.000Z`);
    if (query.to) filter.lte = new Date(`${query.to}T23:59:59.999Z`);
    return filter;
  }

  async createOwn(patientId: string, dto: FoodLogCreateInput) {
    const log = await this.prisma.foodLog.create({
      data: {
        patientId,
        ...(dto.date ? { date: new Date(dto.date) } : {}),
        mealType: dto.mealType,
        items: dto.items,
        description: dto.description ?? null,
        hungerBefore: dto.hungerBefore ?? null,
        fullnessAfter: dto.fullnessAfter ?? null,
        symptoms: dto.symptoms ?? null,
      },
    });

    await this.audit.log({
      userId: patientId,
      action: "CREATE",
      entityType: "FoodLog",
      entityId: log.id,
    });

    return log;
  }

  async listOwn(patientId: string, query: OwnFoodLogsQuery) {
    const date = this.dateFilter(query);
    const logs = await this.prisma.foodLog.findMany({
      where: { patientId, ...(date ? { date } : {}) },
      // id breaks ties so entries sharing a timestamp page in a stable order.
      orderBy: [{ date: "desc" }, { id: "desc" }],
      ...(query.limit ? { take: query.limit } : {}),
      // The where clause still scopes results to this patient, so a cursor id
      // from someone else's diary returns none of their entries.
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });

    await this.audit.log({
      userId: patientId,
      action: "VIEW",
      entityType: "FoodLog",
      entityId: patientId,
    });

    return logs;
  }

  private async findOwn(patientId: string, id: string) {
    const log = await this.prisma.foodLog.findUnique({ where: { id } });
    if (!log) {
      throw new NotFoundException("Food log not found");
    }
    if (log.patientId !== patientId) {
      throw new ForbiddenException("You do not have access to this entry");
    }
    return log;
  }

  async updateOwn(patientId: string, id: string, dto: FoodLogUpdateInput) {
    await this.findOwn(patientId, id);

    const log = await this.prisma.foodLog.update({
      where: { id },
      // patientId is never taken from the DTO, so an entry cannot be moved to
      // another patient's diary.
      data: {
        ...(dto.mealType !== undefined ? { mealType: dto.mealType } : {}),
        ...(dto.items !== undefined ? { items: dto.items } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.hungerBefore !== undefined ? { hungerBefore: dto.hungerBefore } : {}),
        ...(dto.fullnessAfter !== undefined ? { fullnessAfter: dto.fullnessAfter } : {}),
        ...(dto.symptoms !== undefined ? { symptoms: dto.symptoms } : {}),
      },
    });

    await this.audit.log({
      userId: patientId,
      action: "UPDATE",
      entityType: "FoodLog",
      entityId: log.id,
    });

    return log;
  }

  async removeOwn(patientId: string, id: string) {
    await this.findOwn(patientId, id);
    await this.prisma.foodLog.delete({ where: { id } });

    await this.audit.log({
      userId: patientId,
      action: "UPDATE",
      entityType: "FoodLog",
      entityId: id,
    });
  }

  /** Dietitian-side read of a linked patient's diary. */
  async listForPatient(dietitianId: string, patientId: string, query: FoodLogsQuery) {
    const patient = await this.prisma.patientProfile.findUnique({
      where: { userId: patientId },
      select: { dietitianId: true },
    });
    if (!patient) {
      throw new NotFoundException("Patient not found");
    }
    if (patient.dietitianId !== dietitianId) {
      throw new ForbiddenException("You do not have access to this patient");
    }

    const date = this.dateFilter(query);
    const logs = await this.prisma.foodLog.findMany({
      where: { patientId, ...(date ? { date } : {}) },
      orderBy: { date: "desc" },
    });

    await this.audit.log({
      userId: dietitianId,
      action: "VIEW",
      entityType: "FoodLog",
      entityId: patientId,
    });

    return logs;
  }
}
