import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { DiagnosisCreateInput, DiagnosisStatus, DiagnosisUpdateInput } from "@repo/types";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";

@Injectable()
export class DiagnosesService {
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

  /**
   * Loads a diagnosis the caller is allowed to touch. Ownership is checked
   * against the row's own dietitianId, so a diagnosis can never be read or
   * edited through another dietitian's session.
   */
  private async findOwned(dietitianId: string, id: string) {
    const diagnosis = await this.prisma.diagnosis.findUnique({ where: { id } });
    if (!diagnosis) {
      throw new NotFoundException("Diagnosis not found");
    }
    if (diagnosis.dietitianId !== dietitianId) {
      throw new ForbiddenException("You do not have access to this diagnosis");
    }
    return diagnosis;
  }

  async create(dietitianId: string, dto: DiagnosisCreateInput) {
    await this.assertOwnership(dietitianId, dto.patientId);

    const diagnosis = await this.prisma.diagnosis.create({
      data: {
        patientId: dto.patientId,
        dietitianId,
        assessmentId: dto.assessmentId ?? null,
        domain: dto.domain,
        problemCode: dto.problemCode ?? null,
        problem: dto.problem,
        etiology: dto.etiology,
        signsSymptoms: dto.signsSymptoms,
        evidence: dto.evidence,
        // There are no AI features, so nothing may be recorded as AI-generated.
        aiGenerated: false,
      },
    });

    await this.audit.log({
      userId: dietitianId,
      action: "CREATE",
      entityType: "Diagnosis",
      entityId: diagnosis.id,
    });

    return diagnosis;
  }

  async listForPatient(dietitianId: string, patientId: string, status?: DiagnosisStatus) {
    await this.assertOwnership(dietitianId, patientId);

    const diagnoses = await this.prisma.diagnosis.findMany({
      where: { patientId, ...(status ? { status } : {}) },
      orderBy: { createdAt: "desc" },
    });

    await this.audit.log({
      userId: dietitianId,
      action: "VIEW",
      entityType: "Diagnosis",
      entityId: patientId,
    });

    return diagnoses;
  }

  async update(dietitianId: string, id: string, dto: DiagnosisUpdateInput) {
    await this.findOwned(dietitianId, id);

    const diagnosis = await this.prisma.diagnosis.update({
      where: { id },
      // Fields are copied across explicitly: patientId, dietitianId and
      // aiGenerated are not editable through this endpoint.
      data: {
        ...(dto.domain !== undefined ? { domain: dto.domain } : {}),
        ...(dto.problemCode !== undefined ? { problemCode: dto.problemCode } : {}),
        ...(dto.problem !== undefined ? { problem: dto.problem } : {}),
        ...(dto.etiology !== undefined ? { etiology: dto.etiology } : {}),
        ...(dto.signsSymptoms !== undefined ? { signsSymptoms: dto.signsSymptoms } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.evidence !== undefined ? { evidence: dto.evidence } : {}),
      },
    });

    await this.audit.log({
      userId: dietitianId,
      action: "UPDATE",
      entityType: "Diagnosis",
      entityId: diagnosis.id,
    });

    return diagnosis;
  }
}
