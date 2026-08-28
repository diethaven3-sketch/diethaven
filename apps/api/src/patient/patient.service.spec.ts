import { NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PatientService } from "./patient.service";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";

describe("PatientService", () => {
  const patientId = "patient-1";

  const prisma = {
    patientProfile: { findUnique: jest.fn() },
    assessment: { findMany: jest.fn() },
  };
  const audit = { log: jest.fn() };

  let service: PatientService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        PatientService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();
    service = module.get(PatientService);
  });

  describe("getLinkedDietitian", () => {
    it("throws NotFoundException when the patient profile does not exist", async () => {
      prisma.patientProfile.findUnique.mockResolvedValue(null);

      await expect(service.getLinkedDietitian(patientId)).rejects.toBeInstanceOf(NotFoundException);
    });

    it("returns the linked dietitian and audits the view", async () => {
      const dietitian = { id: "dietitian-1", name: "Dr. A", email: "a@x.com", phone: null };
      prisma.patientProfile.findUnique.mockResolvedValue({ id: "profile-1", dietitian });

      const result = await service.getLinkedDietitian(patientId);

      expect(result).toBe(dietitian);
      expect(audit.log).toHaveBeenCalledWith({
        userId: patientId,
        action: "VIEW",
        entityType: "PatientProfile",
        entityId: "profile-1",
      });
    });

    it("returns null when the patient is not yet linked to a dietitian", async () => {
      prisma.patientProfile.findUnique.mockResolvedValue({ id: "profile-1", dietitian: null });

      await expect(service.getLinkedDietitian(patientId)).resolves.toBeNull();
    });
  });

  describe("getOwnAssessments", () => {
    it("returns the patient's assessments and audits the view", async () => {
      const assessments = [{ id: "assessment-1" }];
      prisma.assessment.findMany.mockResolvedValue(assessments);

      const result = await service.getOwnAssessments(patientId);

      expect(result).toBe(assessments);
      expect(prisma.assessment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { patientId, domain: "ANTHROPOMETRIC" } }),
      );
      expect(audit.log).toHaveBeenCalledWith({
        userId: patientId,
        action: "VIEW",
        entityType: "Assessment",
        entityId: patientId,
      });
    });
  });
});
