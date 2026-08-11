import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { AssessmentCreateInput } from "@repo/types";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

@Injectable()
export class AssessmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private async assertOwnership(dietitianId: string, patientId: string) {
    const patient = await this.prisma.patientProfile.findUnique({
      where: { userId: patientId },
      select: { dietitianId: true },
    });
    if (!patient) {
      throw new NotFoundException("Patient not found");
    }
    if (patient.dietitianId !== dietitianId) {
      throw new ForbiddenException("You do not have access to this patient");
    }
  }

  async create(dietitianId: string, dto: AssessmentCreateInput) {
    await this.assertOwnership(dietitianId, dto.patientId);

    const heightMeters = dto.height / 100;
    const bmi = round1(dto.weight / (heightMeters * heightMeters));

    const assessment = await this.prisma.assessment.create({
      data: {
        patientId: dto.patientId,
        dietitianId,
        domain: "ANTHROPOMETRIC",
        domainData: { height: dto.height, weight: dto.weight, bmi },
      },
    });

    await this.audit.log({
      userId: dietitianId,
      action: "CREATE",
      entityType: "Assessment",
      entityId: assessment.id,
    });

    return assessment;
  }

  async listForPatient(dietitianId: string, patientId: string) {
    await this.assertOwnership(dietitianId, patientId);

    const assessments = await this.prisma.assessment.findMany({
      where: { patientId, domain: "ANTHROPOMETRIC" },
      orderBy: { date: "desc" },
    });

    await this.audit.log({
      userId: dietitianId,
      action: "VIEW",
      entityType: "Assessment",
      entityId: patientId,
    });

    return assessments;
  }
}
