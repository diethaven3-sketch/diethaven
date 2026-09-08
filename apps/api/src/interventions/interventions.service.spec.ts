import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { InterventionsService } from "./interventions.service";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";

describe("InterventionsService", () => {
  const dietitianA = "dietitian-a";
  const dietitianB = "dietitian-b";
  const patientId = "patient-1";
  const diagnosisId = "diagnosis-1";

  const mealPlan = {
    name: "1800 kcal exchange plan",
    meals: [
      {
        mealType: "BREAKFAST" as const,
        time: "07:30",
        items: [
          {
            foodExchangeItemId: "food-1",
            foodName: "Boiled yam",
            exchangeGroup: "STARCHES" as const,
            portionSize: "1 medium slice",
            exchanges: 2,
            calories: 80,
          },
        ],
      },
    ],
    calorieTarget: 1800,
  };

  const validIntervention = {
    patientId,
    diagnosisId,
    carePlanDetails: "Carbohydrate-controlled plan with portion education.",
    prescription: { energyKcal: 1800, carbsG: 200 },
  };

  const tx = {
    mealPlan: { create: jest.fn(), delete: jest.fn() },
    intervention: { create: jest.fn(), update: jest.fn() },
  };

  const prisma = {
    patientProfile: { findUnique: jest.fn() },
    diagnosis: { findUnique: jest.fn() },
    intervention: { findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn() },
    $transaction: jest.fn((callback: (client: typeof tx) => unknown) => callback(tx)),
  };
  const audit = { log: jest.fn() };

  let service: InterventionsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        InterventionsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();
    service = module.get(InterventionsService);
  });

  describe("create", () => {
    it("refuses another dietitian's patient", async () => {
      prisma.patientProfile.findUnique.mockResolvedValue({ dietitianId: dietitianB });

      await expect(service.create(dietitianA, validIntervention)).rejects.toBeInstanceOf(ForbiddenException);
      expect(tx.intervention.create).not.toHaveBeenCalled();
    });

    it("throws NotFoundException when the diagnosis does not exist", async () => {
      prisma.patientProfile.findUnique.mockResolvedValue({ dietitianId: dietitianA });
      prisma.diagnosis.findUnique.mockResolvedValue(null);

      await expect(service.create(dietitianA, validIntervention)).rejects.toBeInstanceOf(NotFoundException);
    });

    it("refuses a diagnosis belonging to a different patient", async () => {
      prisma.patientProfile.findUnique.mockResolvedValue({ dietitianId: dietitianA });
      prisma.diagnosis.findUnique.mockResolvedValue({ patientId: "someone-else", dietitianId: dietitianA });

      await expect(service.create(dietitianA, validIntervention)).rejects.toBeInstanceOf(ForbiddenException);
      expect(tx.intervention.create).not.toHaveBeenCalled();
    });

    it("links the intervention to its diagnosis and audits creation", async () => {
      prisma.patientProfile.findUnique.mockResolvedValue({ dietitianId: dietitianA });
      prisma.diagnosis.findUnique.mockResolvedValue({ patientId, dietitianId: dietitianA });
      tx.intervention.create.mockResolvedValue({ id: "intervention-1" });

      await service.create(dietitianA, validIntervention);

      expect(tx.intervention.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            patientId,
            dietitianId: dietitianA,
            diagnosisId,
            mealPlanId: null,
            aiGenerated: false,
          }),
        }),
      );
      expect(audit.log).toHaveBeenCalledWith({
        userId: dietitianA,
        action: "CREATE",
        entityType: "Intervention",
        entityId: "intervention-1",
      });
    });

    it("creates the meal plan and the intervention in one transaction", async () => {
      prisma.patientProfile.findUnique.mockResolvedValue({ dietitianId: dietitianA });
      prisma.diagnosis.findUnique.mockResolvedValue({ patientId, dietitianId: dietitianA });
      tx.mealPlan.create.mockResolvedValue({ id: "meal-plan-1" });
      tx.intervention.create.mockResolvedValue({ id: "intervention-1" });

      await service.create(dietitianA, { ...validIntervention, mealPlan });

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(tx.mealPlan.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ patientId, name: mealPlan.name }) }),
      );
      expect(tx.intervention.create.mock.calls[0][0].data.mealPlanId).toBe("meal-plan-1");
    });

    it("never records an intervention as AI-generated", async () => {
      prisma.patientProfile.findUnique.mockResolvedValue({ dietitianId: dietitianA });
      prisma.diagnosis.findUnique.mockResolvedValue({ patientId, dietitianId: dietitianA });
      tx.intervention.create.mockResolvedValue({ id: "intervention-1" });

      await service.create(dietitianA, { ...validIntervention, aiGenerated: true } as never);

      expect(tx.intervention.create.mock.calls[0][0].data.aiGenerated).toBe(false);
    });
  });

  describe("update", () => {
    it("refuses an intervention owned by another dietitian", async () => {
      prisma.intervention.findUnique.mockResolvedValue({ id: "intervention-1", dietitianId: dietitianB });

      await expect(service.update(dietitianA, "intervention-1", { status: "COMPLETED" })).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.intervention.update).not.toHaveBeenCalled();
    });

    it("never re-points an intervention at a different diagnosis or patient", async () => {
      prisma.intervention.findUnique.mockResolvedValue({ id: "intervention-1", dietitianId: dietitianA });
      prisma.intervention.update.mockResolvedValue({ id: "intervention-1" });

      await service.update(dietitianA, "intervention-1", {
        status: "COMPLETED",
        diagnosisId: "another-diagnosis",
        patientId: "someone-else",
        aiGenerated: true,
      } as never);

      expect(prisma.intervention.update.mock.calls[0][0].data).toEqual({ status: "COMPLETED" });
    });
  });

  describe("setMealPlan", () => {
    it("refuses an intervention owned by another dietitian", async () => {
      prisma.intervention.findUnique.mockResolvedValue({ id: "intervention-1", dietitianId: dietitianB });

      await expect(service.setMealPlan(dietitianA, "intervention-1", mealPlan)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(tx.mealPlan.create).not.toHaveBeenCalled();
    });

    it("attaches the new plan before deleting the one it supersedes", async () => {
      prisma.intervention.findUnique.mockResolvedValue({
        id: "intervention-1",
        dietitianId: dietitianA,
        patientId,
        mealPlanId: "old-plan",
      });
      tx.mealPlan.create.mockResolvedValue({ id: "new-plan" });
      tx.intervention.update.mockResolvedValue({ id: "intervention-1" });

      await service.setMealPlan(dietitianA, "intervention-1", mealPlan);

      const updateOrder = tx.intervention.update.mock.invocationCallOrder[0] ?? 0;
      const deleteOrder = tx.mealPlan.delete.mock.invocationCallOrder[0] ?? 0;
      expect(updateOrder).toBeGreaterThan(0);
      expect(deleteOrder).toBeGreaterThan(updateOrder);
      expect(tx.intervention.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { mealPlanId: "new-plan" } }),
      );
      expect(tx.mealPlan.delete).toHaveBeenCalledWith({ where: { id: "old-plan" } });
    });

    it("leaves nothing to delete when the intervention had no plan", async () => {
      prisma.intervention.findUnique.mockResolvedValue({
        id: "intervention-1",
        dietitianId: dietitianA,
        patientId,
        mealPlanId: null,
      });
      tx.mealPlan.create.mockResolvedValue({ id: "new-plan" });
      tx.intervention.update.mockResolvedValue({ id: "intervention-1" });

      await service.setMealPlan(dietitianA, "intervention-1", mealPlan);

      expect(tx.mealPlan.delete).not.toHaveBeenCalled();
    });
  });
});
