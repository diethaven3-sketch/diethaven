import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { AssessmentsService } from "./assessments.service";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";

describe("AssessmentsService ownership", () => {
  const dietitianA = "dietitian-a";
  const dietitianB = "dietitian-b";
  const patientId = "patient-1";

  const prisma = {
    patientProfile: { findUnique: jest.fn() },
    assessment: { create: jest.fn(), findMany: jest.fn() },
  };
  const audit = { log: jest.fn() };

  let service: AssessmentsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        AssessmentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();
    service = module.get(AssessmentsService);
  });

  it("throws NotFoundException when the patient does not exist", async () => {
    prisma.patientProfile.findUnique.mockResolvedValue(null);

    await expect(service.listForPatient(dietitianA, patientId)).rejects.toBeInstanceOf(NotFoundException);
  });

  it("throws ForbiddenException when a dietitian requests another dietitian's patient", async () => {
    prisma.patientProfile.findUnique.mockResolvedValue({ dietitianId: dietitianB });

    await expect(service.listForPatient(dietitianA, patientId)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.create(dietitianA, { patientId, domain: "ANTHROPOMETRIC", data: { height: 170, weight: 70 } }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.assessment.create).not.toHaveBeenCalled();
    expect(prisma.assessment.findMany).not.toHaveBeenCalled();
  });

  it("computes BMI and audits creation for the owning dietitian", async () => {
    prisma.patientProfile.findUnique.mockResolvedValue({ dietitianId: dietitianA });
    prisma.assessment.create.mockResolvedValue({ id: "assessment-1" });

    await service.create(dietitianA, { patientId, domain: "ANTHROPOMETRIC", data: { height: 170, weight: 70 } });

    expect(prisma.assessment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          domainData: { height: 170, weight: 70, bmi: 24.2 },
        }),
      }),
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: "CREATE", entityType: "Assessment", entityId: "assessment-1" }),
    );
  });

  it("flags lab values against the standard reference ranges", async () => {
    prisma.patientProfile.findUnique.mockResolvedValue({ dietitianId: dietitianA });
    prisma.assessment.create.mockResolvedValue({ id: "assessment-2" });

    await service.create(dietitianA, {
      patientId,
      domain: "BIOCHEMICAL",
      data: {
        testDate: "2026-09-01",
        values: [
          { marker: "HBA1C", value: 8.2 },
          { marker: "FASTING_GLUCOSE", value: 85 },
          { marker: "HDL_CHOLESTEROL", value: 31 },
        ],
      },
    });

    const domainData = prisma.assessment.create.mock.calls[0][0].data.domainData;
    expect(domainData.values).toEqual([
      expect.objectContaining({ marker: "HBA1C", flag: "HIGH", unit: "%", referenceHigh: 5.6 }),
      expect.objectContaining({ marker: "FASTING_GLUCOSE", flag: "NORMAL" }),
      expect.objectContaining({ marker: "HDL_CHOLESTEROL", flag: "LOW", referenceLow: 40 }),
    ]);
  });

  it("stores narrative domains verbatim and records the domain on the row", async () => {
    prisma.patientProfile.findUnique.mockResolvedValue({ dietitianId: dietitianA });
    prisma.assessment.create.mockResolvedValue({ id: "assessment-3" });

    const data = { livingSituation: "Lives with family", physicalActivityLevel: "SEDENTARY" as const };
    await service.create(dietitianA, { patientId, domain: "ENVIRONMENTAL", data });

    expect(prisma.assessment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ domain: "ENVIRONMENTAL", domainData: data }),
      }),
    );
  });

  it("filters by domain only when one is requested", async () => {
    prisma.patientProfile.findUnique.mockResolvedValue({ dietitianId: dietitianA });
    prisma.assessment.findMany.mockResolvedValue([]);

    await service.listForPatient(dietitianA, patientId);
    expect(prisma.assessment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { patientId } }),
    );

    await service.listForPatient(dietitianA, patientId, "DIETARY");
    expect(prisma.assessment.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({ where: { patientId, domain: "DIETARY" } }),
    );
  });
});
