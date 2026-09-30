import { Injectable } from "@nestjs/common";
import type { AdminStats } from "@repo/types";
import { PrismaService } from "../prisma/prisma.service";

const DAY_MS = 24 * 60 * 60 * 1000;
export const SIGNUP_WEEKS = 12;
export const ACTIVITY_DAYS = 14;

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

/** Monday 00:00 UTC of the week containing `date`. */
export function weekStart(date: Date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const offset = (d.getUTCDay() + 6) % 7;
  return new Date(d.getTime() - offset * DAY_MS);
}

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(now = new Date()): Promise<AdminStats> {
    const firstWeek = new Date(weekStart(now).getTime() - (SIGNUP_WEEKS - 1) * 7 * DAY_MS);
    const firstDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - (ACTIVITY_DAYS - 1) * DAY_MS);

    const [dietitiansByStatus, invitesByStatus, lapsedInvites, patientCount, assessmentCount, newUsers, activityRows, recent] =
      await Promise.all([
        this.prisma.dietitianProfile.groupBy({ by: ["approvalStatus"], _count: true }),
        this.prisma.invite.groupBy({ by: ["status"], _count: true }),
        this.prisma.invite.count({ where: { status: "PENDING", expiresAt: { lte: now } } }),
        this.prisma.patientProfile.count(),
        this.prisma.assessment.count(),
        this.prisma.user.findMany({
          where: { role: { in: ["DIETITIAN", "PATIENT"] }, createdAt: { gte: firstWeek } },
          select: { role: true, createdAt: true },
        }),
        // Grouped in SQL: VIEW rows are written on every page load, so pulling
        // them into memory to count would scale with traffic, not with days.
        this.prisma.$queryRaw<{ day: string; action: string; count: number }[]>`
          SELECT to_char(date_trunc('day', "timestamp"), 'YYYY-MM-DD') AS day,
                 action::text AS action,
                 COUNT(*)::int AS count
          FROM "AuditLog"
          WHERE "timestamp" >= ${firstDay}
          GROUP BY 1, 2`,
        this.prisma.auditLog.findMany({
          where: { action: { in: ["CREATE", "UPDATE"] } },
          include: { user: { select: { id: true, name: true, role: true } } },
          orderBy: { timestamp: "desc" },
          take: 10,
        }),
      ]);

    const signups = Array.from({ length: SIGNUP_WEEKS }, (_, i) => ({
      weekStart: dayKey(new Date(firstWeek.getTime() + i * 7 * DAY_MS)),
      dietitians: 0,
      patients: 0,
    }));
    const signupIndex = new Map(signups.map((week) => [week.weekStart, week]));
    for (const user of newUsers) {
      const week = signupIndex.get(dayKey(weekStart(user.createdAt)));
      if (!week) continue;
      if (user.role === "DIETITIAN") week.dietitians += 1;
      else week.patients += 1;
    }

    const activity = Array.from({ length: ACTIVITY_DAYS }, (_, i) => ({
      date: dayKey(new Date(firstDay.getTime() + i * DAY_MS)),
      changes: 0,
      views: 0,
    }));
    const activityIndex = new Map(activity.map((day) => [day.date, day]));
    for (const row of activityRows) {
      const day = activityIndex.get(row.day);
      if (!day) continue;
      if (row.action === "VIEW") day.views += Number(row.count);
      else day.changes += Number(row.count);
    }

    return {
      dietitians: Object.fromEntries(dietitiansByStatus.map((row) => [row.approvalStatus, row._count])),
      invites: Object.fromEntries(invitesByStatus.map((row) => [row.status, row._count])),
      lapsedInvites,
      patientCount,
      assessmentCount,
      signups,
      activity,
      recentActions: recent.map((entry) => ({
        id: entry.id,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        timestamp: entry.timestamp.toISOString(),
        user: entry.user,
      })),
    };
  }
}
