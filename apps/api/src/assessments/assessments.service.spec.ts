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
      service.create(dietitianA, { patientId, height: 170, weight: 70 }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.assessment.create).not.toHaveBeenCalled();
    expect(prisma.assessment.findMany).not.toHaveBeenCalled();
  });

  it("computes BMI and audits creation for the owning dietitian", async () => {
    prisma.patientProfile.findUnique.mockResolvedValue({ dietitianId: dietitianA });
    prisma.assessment.create.mockResolvedValue({ id: "assessment-1" });

    await service.create(dietitianA, { patientId, height: 170, weight: 70 });

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
});
