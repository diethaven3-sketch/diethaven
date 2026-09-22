import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { FollowUpsService } from "./follow-ups.service";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";

describe("FollowUpsService", () => {
  const dietitianA = "dietitian-a";
  const dietitianB = "dietitian-b";
  const patientId = "patient-1";

  const validFollowUp = {
    patientId,
    diagnosisId: "diagnosis-1",
    outcome: "IMPROVED" as const,
    notes: "HbA1c down to 7.1%. Patient reports sticking to the exchange plan on weekdays.",
  };

  const prisma = {
    patientProfile: { findUnique: jest.fn() },
    diagnosis: { findUnique: jest.fn() },
    intervention: { findUnique: jest.fn() },
    followUp: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
  };
  const audit = { log: jest.fn() };

  let service: FollowUpsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        FollowUpsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();
    service = module.get(FollowUpsService);
  });

  describe("create", () => {
    it("refuses another dietitian's patient", async () => {
      prisma.patientProfile.findUnique.mockResolvedValue({ dietitianId: dietitianB });

      await expect(service.create(dietitianA, validFollowUp)).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.followUp.create).not.toHaveBeenCalled();
    });

    it("refuses a diagnosis belonging to a different patient", async () => {
      prisma.patientProfile.findUnique.mockResolvedValue({ dietitianId: dietitianA });
      prisma.diagnosis.findUnique.mockResolvedValue({ patientId: "someone-else", dietitianId: dietitianA });

      await expect(service.create(dietitianA, validFollowUp)).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.followUp.create).not.toHaveBeenCalled();
    });

    it("refuses an intervention belonging to a different patient", async () => {
      prisma.patientProfile.findUnique.mockResolvedValue({ dietitianId: dietitianA });
      prisma.intervention.findUnique.mockResolvedValue({ patientId: "someone-else", dietitianId: dietitianA });

      await expect(
        service.create(dietitianA, { ...validFollowUp, diagnosisId: undefined, interventionId: "intervention-1" }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.followUp.create).not.toHaveBeenCalled();
    });

    it("throws NotFoundException when the referenced diagnosis is missing", async () => {
      prisma.patientProfile.findUnique.mockResolvedValue({ dietitianId: dietitianA });
      prisma.diagnosis.findUnique.mockResolvedValue(null);

      await expect(service.create(dietitianA, validFollowUp)).rejects.toBeInstanceOf(NotFoundException);
    });

    it("records the outcome against the reviewed diagnosis and audits creation", async () => {
      prisma.patientProfile.findUnique.mockResolvedValue({ dietitianId: dietitianA });
      prisma.diagnosis.findUnique.mockResolvedValue({ patientId, dietitianId: dietitianA });
      prisma.followUp.create.mockResolvedValue({ id: "follow-up-1" });

      await service.create(dietitianA, validFollowUp);

      expect(prisma.followUp.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            patientId,
            dietitianId: dietitianA,
            diagnosisId: "diagnosis-1",
            interventionId: null,
            outcome: "IMPROVED",
          }),
        }),
      );
      expect(audit.log).toHaveBeenCalledWith({
        userId: dietitianA,
        action: "CREATE",
        entityType: "FollowUp",
        entityId: "follow-up-1",
      });
    });
  });

  describe("listForPatient", () => {
    it("refuses another dietitian's patient", async () => {
      prisma.patientProfile.findUnique.mockResolvedValue({ dietitianId: dietitianB });

      await expect(service.listForPatient(dietitianA, patientId)).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.followUp.findMany).not.toHaveBeenCalled();
    });

    it("returns the visit history newest first and audits the view", async () => {
      prisma.patientProfile.findUnique.mockResolvedValue({ dietitianId: dietitianA });
      prisma.followUp.findMany.mockResolvedValue([]);

      await service.listForPatient(dietitianA, patientId);

      expect(prisma.followUp.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { patientId }, orderBy: { date: "desc" } }),
      );
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: "VIEW", entityType: "FollowUp", entityId: patientId }),
      );
    });
  });

  describe("update", () => {
    it("refuses a follow-up owned by another dietitian", async () => {
      prisma.followUp.findUnique.mockResolvedValue({ id: "follow-up-1", dietitianId: dietitianB });

      await expect(service.update(dietitianA, "follow-up-1", { outcome: "RESOLVED" })).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.followUp.update).not.toHaveBeenCalled();
    });

    it("never re-points a visit note at a different diagnosis or patient", async () => {
      prisma.followUp.findUnique.mockResolvedValue({ id: "follow-up-1", dietitianId: dietitianA });
      prisma.followUp.update.mockResolvedValue({ id: "follow-up-1" });

      await service.update(dietitianA, "follow-up-1", {
        outcome: "RESOLVED",
        diagnosisId: "another-diagnosis",
        interventionId: "another-intervention",
        patientId: "someone-else",
      } as never);

      expect(prisma.followUp.update.mock.calls[0][0].data).toEqual({ outcome: "RESOLVED" });
    });
  });
});
