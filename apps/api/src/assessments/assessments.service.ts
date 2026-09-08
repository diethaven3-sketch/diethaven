import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import {
  flagLabValue,
  LAB_REFERENCES,
  type AssessmentCreateInput,
  type AssessmentDomain,
} from "@repo/types";
import type { Prisma } from "database";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

/**
 * Turns a validated per-domain payload into the JSON stored on the row,
 * computing any derived values. Derived values are always calculated here and
 * never accepted from the client, so a stored BMI or lab flag can be trusted.
 */
function buildDomainData(dto: AssessmentCreateInput): Prisma.InputJsonValue {
  switch (dto.domain) {
    case "ANTHROPOMETRIC": {
      const heightMeters = dto.data.height / 100;
      const bmi = round1(dto.data.weight / (heightMeters * heightMeters));
      return { height: dto.data.height, weight: dto.data.weight, bmi };
    }
    case "BIOCHEMICAL": {
      return {
        testDate: dto.data.testDate,
        ...(dto.data.notes ? { notes: dto.data.notes } : {}),
        values: dto.data.values.map(({ marker, value }) => {
          const reference = LAB_REFERENCES[marker];
          return {
            marker,
            value,
            unit: reference.unit,
            referenceLow: reference.low,
            referenceHigh: reference.high,
            flag: flagLabValue(marker, value),
          };
        }),
      };
    }
    default:
      return dto.data;
  }
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

    const assessment = await this.prisma.assessment.create({
      data: {
        patientId: dto.patientId,
        dietitianId,
        domain: dto.domain,
        domainData: buildDomainData(dto),
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

  async listForPatient(dietitianId: string, patientId: string, domain?: AssessmentDomain) {
    await this.assertOwnership(dietitianId, patientId);

    const assessments = await this.prisma.assessment.findMany({
      where: { patientId, ...(domain ? { domain } : {}) },
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
