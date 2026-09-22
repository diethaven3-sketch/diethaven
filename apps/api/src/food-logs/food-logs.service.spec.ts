import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { FoodLogsService } from "./food-logs.service";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";

describe("FoodLogsService", () => {
  const patientA = "patient-a";
  const patientB = "patient-b";
  const dietitianA = "dietitian-a";
  const dietitianB = "dietitian-b";

  const validLog = {
    mealType: "BREAKFAST" as const,
    items: [
      {
        foodExchangeItemId: "food-1",
        foodName: "Boiled yam",
        exchangeGroup: "STARCHES" as const,
        portionSize: "1 medium slice",
        exchanges: 2,
      },
    ],
  };

  const prisma = {
    patientProfile: { findUnique: jest.fn() },
    foodLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };
  const audit = { log: jest.fn() };

  let service: FoodLogsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        FoodLogsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();
    service = module.get(FoodLogsService);
  });

  describe("createOwn", () => {
    it("always files the entry under the authenticated patient", async () => {
      prisma.foodLog.create.mockResolvedValue({ id: "log-1" });

      await service.createOwn(patientA, { ...validLog, patientId: patientB } as never);

      expect(prisma.foodLog.create.mock.calls[0][0].data.patientId).toBe(patientA);
      expect(audit.log).toHaveBeenCalledWith({
        userId: patientA,
        action: "CREATE",
        entityType: "FoodLog",
        entityId: "log-1",
      });
    });
  });

  describe("listOwn", () => {
    it("bounds the range so the end date's later entries are still included", async () => {
      prisma.foodLog.findMany.mockResolvedValue([]);

      await service.listOwn(patientA, { from: "2026-09-01", to: "2026-09-07" });

      const where = prisma.foodLog.findMany.mock.calls[0][0].where;
      expect(where.patientId).toBe(patientA);
      expect(where.date.gte).toEqual(new Date("2026-09-01T00:00:00.000Z"));
      expect(where.date.lte).toEqual(new Date("2026-09-07T23:59:59.999Z"));
    });

    it("omits the date filter entirely when no range is given", async () => {
      prisma.foodLog.findMany.mockResolvedValue([]);

      await service.listOwn(patientA, {});

      expect(prisma.foodLog.findMany.mock.calls[0][0].where).toEqual({ patientId: patientA });
    });
  });

  describe("updateOwn", () => {
    it("refuses an entry belonging to another patient", async () => {
      prisma.foodLog.findUnique.mockResolvedValue({ id: "log-1", patientId: patientB });

      await expect(service.updateOwn(patientA, "log-1", { mealType: "LUNCH" })).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.foodLog.update).not.toHaveBeenCalled();
    });

    it("never moves an entry into another patient's diary", async () => {
      prisma.foodLog.findUnique.mockResolvedValue({ id: "log-1", patientId: patientA });
      prisma.foodLog.update.mockResolvedValue({ id: "log-1" });

      await service.updateOwn(patientA, "log-1", { mealType: "LUNCH", patientId: patientB } as never);

      expect(prisma.foodLog.update.mock.calls[0][0].data).toEqual({ mealType: "LUNCH" });
    });
  });

  describe("removeOwn", () => {
    it("refuses an entry belonging to another patient", async () => {
      prisma.foodLog.findUnique.mockResolvedValue({ id: "log-1", patientId: patientB });

      await expect(service.removeOwn(patientA, "log-1")).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.foodLog.delete).not.toHaveBeenCalled();
    });

    it("throws NotFoundException for an entry that does not exist", async () => {
      prisma.foodLog.findUnique.mockResolvedValue(null);

      await expect(service.removeOwn(patientA, "missing")).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("listForPatient", () => {
    it("refuses a patient not linked to this dietitian", async () => {
      prisma.patientProfile.findUnique.mockResolvedValue({ dietitianId: dietitianB });

      await expect(service.listForPatient(dietitianA, patientA, {})).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.foodLog.findMany).not.toHaveBeenCalled();
    });

    it("audits the dietitian's view against their own id, not the patient's", async () => {
      prisma.patientProfile.findUnique.mockResolvedValue({ dietitianId: dietitianA });
      prisma.foodLog.findMany.mockResolvedValue([]);

      await service.listForPatient(dietitianA, patientA, {});

      expect(audit.log).toHaveBeenCalledWith({
        userId: dietitianA,
        action: "VIEW",
        entityType: "FoodLog",
        entityId: patientA,
      });
    });
  });
});
