import { Test } from "@nestjs/testing";
import { StatsService, weekStart } from "./stats.service";
import { PrismaService } from "../prisma/prisma.service";

describe("StatsService", () => {
  const now = new Date("2026-09-30T12:00:00.000Z"); // a Wednesday
  const prisma = {
    dietitianProfile: { groupBy: jest.fn().mockResolvedValue([{ approvalStatus: "APPROVED", _count: 2 }]) },
    invite: { groupBy: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(1) },
    patientProfile: { count: jest.fn().mockResolvedValue(3) },
    assessment: { count: jest.fn().mockResolvedValue(4) },
    user: { findMany: jest.fn() },
    auditLog: { findMany: jest.fn() },
    $queryRaw: jest.fn(),
  };
  let service: StatsService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [StatsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(StatsService);
  });

  it("starts weeks on Monday UTC", () => {
    expect(weekStart(now).toISOString()).toBe("2026-09-28T00:00:00.000Z");
    expect(weekStart(new Date("2026-09-27T23:00:00.000Z")).toISOString()).toBe("2026-09-21T00:00:00.000Z");
  });

  it("buckets sign-ups by week and audit events by day", async () => {
    prisma.user.findMany.mockResolvedValue([
      { role: "PATIENT", createdAt: new Date("2026-09-29T10:00:00.000Z") },
      { role: "PATIENT", createdAt: new Date("2026-09-30T08:00:00.000Z") },
      { role: "DIETITIAN", createdAt: new Date("2026-09-22T08:00:00.000Z") },
    ]);
    prisma.$queryRaw.mockResolvedValue([
      { day: "2026-09-30", action: "VIEW", count: 40 },
      { day: "2026-09-30", action: "CREATE", count: 3 },
      { day: "2026-09-30", action: "UPDATE", count: 2 },
    ]);
    prisma.auditLog.findMany.mockResolvedValue([
      {
        id: "a1",
        action: "CREATE",
        entityType: "Assessment",
        entityId: "x",
        timestamp: now,
        user: { id: "u1", name: "Dr Obi", role: "DIETITIAN" },
      },
    ]);

    const stats = await service.getStats(now);

    expect(stats.signups).toHaveLength(12);
    expect(stats.signups.at(-1)).toEqual({ weekStart: "2026-09-28", dietitians: 0, patients: 2 });
    expect(stats.signups.at(-2)).toEqual({ weekStart: "2026-09-21", dietitians: 1, patients: 0 });
    expect(stats.activity).toHaveLength(14);
    expect(stats.activity.at(-1)).toEqual({ date: "2026-09-30", changes: 5, views: 40 });
    expect(stats.lapsedInvites).toBe(1);
    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { action: { in: ["CREATE", "UPDATE"] } } }),
    );
    expect(stats.recentActions[0]).toMatchObject({ entityType: "Assessment", timestamp: now.toISOString() });
  });
});
