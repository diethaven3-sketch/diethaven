import { NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PatientService } from "./patient.service";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";

describe("PatientService", () => {
  const patientId = "patient-1";

  const prisma = {
    patientProfile: { findUnique: jest.fn(), update: jest.fn() },
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

  describe("getOwnProfile", () => {
    it("throws NotFoundException when the patient profile does not exist", async () => {
      prisma.patientProfile.findUnique.mockResolvedValue(null);

      await expect(service.getOwnProfile(patientId)).rejects.toBeInstanceOf(NotFoundException);
    });

    it("returns the patient's own clinical profile and audits the view", async () => {
      const profile = { id: "profile-1", dateOfBirth: new Date(), sex: "FEMALE", consentStatus: true };
      prisma.patientProfile.findUnique.mockResolvedValue(profile);

      const result = await service.getOwnProfile(patientId);

      expect(result).toBe(profile);
      expect(prisma.patientProfile.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: patientId } }),
      );
      expect(audit.log).toHaveBeenCalledWith({
        userId: patientId,
        action: "VIEW",
        entityType: "PatientProfile",
        entityId: "profile-1",
      });
    });
  });

  describe("updateOwnProfile", () => {
    it("throws NotFoundException when the patient profile does not exist", async () => {
      prisma.patientProfile.findUnique.mockResolvedValue(null);

      await expect(service.updateOwnProfile(patientId, { contact: "12 Marina" })).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.patientProfile.update).not.toHaveBeenCalled();
    });

    it("scopes the update to the caller's own profile and audits it", async () => {
      prisma.patientProfile.findUnique.mockResolvedValue({ id: "profile-1" });
      prisma.patientProfile.update.mockResolvedValue({ id: "profile-1", contact: "12 Marina" });

      await service.updateOwnProfile(patientId, { contact: "12 Marina" });

      expect(prisma.patientProfile.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: patientId }, data: { contact: "12 Marina" } }),
      );
      expect(audit.log).toHaveBeenCalledWith({
        userId: patientId,
        action: "UPDATE",
        entityType: "PatientProfile",
        entityId: "profile-1",
      });
    });

    it("converts dateOfBirth to a Date and omits fields that were not supplied", async () => {
      prisma.patientProfile.findUnique.mockResolvedValue({ id: "profile-1" });
      prisma.patientProfile.update.mockResolvedValue({ id: "profile-1" });

      await service.updateOwnProfile(patientId, { dateOfBirth: "1990-04-02" });

      expect(prisma.patientProfile.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { dateOfBirth: new Date("1990-04-02") } }),
      );
    });

    it("never writes consentStatus or dietitianId, even if they reach the service", async () => {
      prisma.patientProfile.findUnique.mockResolvedValue({ id: "profile-1" });
      prisma.patientProfile.update.mockResolvedValue({ id: "profile-1" });

      await service.updateOwnProfile(patientId, {
        contact: "12 Marina",
        consentStatus: false,
        dietitianId: "someone-else",
      } as never);

      const data = prisma.patientProfile.update.mock.calls[0][0].data;
      expect(data).toEqual({ contact: "12 Marina" });
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
