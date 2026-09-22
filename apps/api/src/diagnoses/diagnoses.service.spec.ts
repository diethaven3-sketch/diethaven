import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { DiagnosesService } from "./diagnoses.service";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";

describe("DiagnosesService", () => {
  const dietitianA = "dietitian-a";
  const dietitianB = "dietitian-b";
  const patientId = "patient-1";

  const validPes = {
    patientId,
    domain: "INTAKE" as const,
    problemCode: "NI-5.8.2",
    problem: "Excessive carbohydrate intake",
    etiology: "limited nutrition-related knowledge",
    signsSymptoms: "24-hour recall showing 65% of energy from refined carbohydrates and HbA1c of 8.2%",
    evidence: [
      {
        assessmentId: "assessment-1",
        domain: "BIOCHEMICAL",
        field: "HBA1C",
        label: "HbA1c",
        value: "8.2 %",
      },
    ],
  };

  const prisma = {
    patientProfile: { findUnique: jest.fn() },
    diagnosis: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
  };
  const audit = { log: jest.fn() };

  let service: DiagnosesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        DiagnosesService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();
    service = module.get(DiagnosesService);
  });

  describe("create", () => {
    it("throws NotFoundException when the patient does not exist", async () => {
      prisma.patientProfile.findUnique.mockResolvedValue(null);

      await expect(service.create(dietitianA, validPes)).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.diagnosis.create).not.toHaveBeenCalled();
    });

    it("refuses to diagnose another dietitian's patient", async () => {
      prisma.patientProfile.findUnique.mockResolvedValue({ dietitianId: dietitianB });

      await expect(service.create(dietitianA, validPes)).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.diagnosis.create).not.toHaveBeenCalled();
    });

    it("stores the PES parts with their evidence and audits creation", async () => {
      prisma.patientProfile.findUnique.mockResolvedValue({ dietitianId: dietitianA });
      prisma.diagnosis.create.mockResolvedValue({ id: "diagnosis-1" });

      await service.create(dietitianA, validPes);

      expect(prisma.diagnosis.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            patientId,
            dietitianId: dietitianA,
            domain: "INTAKE",
            problem: "Excessive carbohydrate intake",
            etiology: "limited nutrition-related knowledge",
            evidence: validPes.evidence,
          }),
        }),
      );
      expect(audit.log).toHaveBeenCalledWith({
        userId: dietitianA,
        action: "CREATE",
        entityType: "Diagnosis",
        entityId: "diagnosis-1",
      });
    });

    it("never records a diagnosis as AI-generated while there are no AI features", async () => {
      prisma.patientProfile.findUnique.mockResolvedValue({ dietitianId: dietitianA });
      prisma.diagnosis.create.mockResolvedValue({ id: "diagnosis-1" });

      await service.create(dietitianA, { ...validPes, aiGenerated: true } as never);

      expect(prisma.diagnosis.create.mock.calls[0][0].data.aiGenerated).toBe(false);
    });
  });

  describe("listForPatient", () => {
    it("refuses another dietitian's patient", async () => {
      prisma.patientProfile.findUnique.mockResolvedValue({ dietitianId: dietitianB });

      await expect(service.listForPatient(dietitianA, patientId)).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.diagnosis.findMany).not.toHaveBeenCalled();
    });

    it("filters by status only when one is requested, and audits the view", async () => {
      prisma.patientProfile.findUnique.mockResolvedValue({ dietitianId: dietitianA });
      prisma.diagnosis.findMany.mockResolvedValue([]);

      await service.listForPatient(dietitianA, patientId);
      expect(prisma.diagnosis.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { patientId } }));

      await service.listForPatient(dietitianA, patientId, "ACTIVE");
      expect(prisma.diagnosis.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({ where: { patientId, status: "ACTIVE" } }),
      );
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: "VIEW", entityType: "Diagnosis", entityId: patientId }),
      );
    });
  });

  describe("update", () => {
    it("throws NotFoundException for a diagnosis that does not exist", async () => {
      prisma.diagnosis.findUnique.mockResolvedValue(null);

      await expect(service.update(dietitianA, "missing", { status: "RESOLVED" })).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.diagnosis.update).not.toHaveBeenCalled();
    });

    it("refuses to edit a diagnosis owned by another dietitian", async () => {
      prisma.diagnosis.findUnique.mockResolvedValue({ id: "diagnosis-1", dietitianId: dietitianB });

      await expect(service.update(dietitianA, "diagnosis-1", { status: "RESOLVED" })).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.diagnosis.update).not.toHaveBeenCalled();
    });

    it("applies only the supplied fields and audits the edit", async () => {
      prisma.diagnosis.findUnique.mockResolvedValue({ id: "diagnosis-1", dietitianId: dietitianA });
      prisma.diagnosis.update.mockResolvedValue({ id: "diagnosis-1" });

      await service.update(dietitianA, "diagnosis-1", { status: "RESOLVED" });

      expect(prisma.diagnosis.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "diagnosis-1" }, data: { status: "RESOLVED" } }),
      );
      expect(audit.log).toHaveBeenCalledWith({
        userId: dietitianA,
        action: "UPDATE",
        entityType: "Diagnosis",
        entityId: "diagnosis-1",
      });
    });

    it("never reassigns ownership or the AI flag through an edit", async () => {
      prisma.diagnosis.findUnique.mockResolvedValue({ id: "diagnosis-1", dietitianId: dietitianA });
      prisma.diagnosis.update.mockResolvedValue({ id: "diagnosis-1" });

      await service.update(dietitianA, "diagnosis-1", {
        problem: "Underweight",
        patientId: "someone-else",
        dietitianId: dietitianB,
        aiGenerated: true,
      } as never);

      expect(prisma.diagnosis.update.mock.calls[0][0].data).toEqual({ problem: "Underweight" });
    });
  });
});
