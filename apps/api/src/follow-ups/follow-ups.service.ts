import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { FollowUpCreateInput, FollowUpUpdateInput } from "@repo/types";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";

const followUpInclude = {
  diagnosis: { select: { id: true, problemCode: true, problem: true, etiology: true } },
  intervention: { select: { id: true, carePlanDetails: true, status: true } },
} as const;

@Injectable()
export class FollowUpsService {
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
   * A follow-up may only reference records belonging to the same dietitian and
   * the same patient — otherwise a visit note could cite another patient's
   * diagnosis or intervention.
   */
  private async assertReferencesFit(dietitianId: string, dto: FollowUpCreateInput) {
    if (dto.diagnosisId) {
      const diagnosis = await this.prisma.diagnosis.findUnique({
        where: { id: dto.diagnosisId },
        select: { patientId: true, dietitianId: true },
      });
      if (!diagnosis) {
        throw new NotFoundException("Diagnosis not found");
      }
      if (diagnosis.dietitianId !== dietitianId || diagnosis.patientId !== dto.patientId) {
        throw new ForbiddenException("That diagnosis does not belong to this patient");
      }
    }

    if (dto.interventionId) {
      const intervention = await this.prisma.intervention.findUnique({
        where: { id: dto.interventionId },
        select: { patientId: true, dietitianId: true },
      });
      if (!intervention) {
        throw new NotFoundException("Intervention not found");
      }
      if (intervention.dietitianId !== dietitianId || intervention.patientId !== dto.patientId) {
        throw new ForbiddenException("That intervention does not belong to this patient");
      }
    }
  }

  async create(dietitianId: string, dto: FollowUpCreateInput) {
    await this.assertOwnership(dietitianId, dto.patientId);
    await this.assertReferencesFit(dietitianId, dto);

    const followUp = await this.prisma.followUp.create({
      data: {
        patientId: dto.patientId,
        dietitianId,
        diagnosisId: dto.diagnosisId ?? null,
        interventionId: dto.interventionId ?? null,
        outcome: dto.outcome,
        notes: dto.notes,
      },
      include: followUpInclude,
    });

    await this.audit.log({
      userId: dietitianId,
      action: "CREATE",
      entityType: "FollowUp",
      entityId: followUp.id,
    });

    return followUp;
  }

  async listForPatient(dietitianId: string, patientId: string) {
    await this.assertOwnership(dietitianId, patientId);

    const followUps = await this.prisma.followUp.findMany({
      where: { patientId },
      orderBy: { date: "desc" },
      include: followUpInclude,
    });

    await this.audit.log({
      userId: dietitianId,
      action: "VIEW",
      entityType: "FollowUp",
      entityId: patientId,
    });

    return followUps;
  }

  async update(dietitianId: string, id: string, dto: FollowUpUpdateInput) {
    const existing = await this.prisma.followUp.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException("Follow-up not found");
    }
    if (existing.dietitianId !== dietitianId) {
      throw new ForbiddenException("You do not have access to this follow-up");
    }

    const followUp = await this.prisma.followUp.update({
      where: { id },
      // Only the outcome and the note are editable. What the visit reviewed is
      // fixed at creation, so a note can't be silently re-pointed at a
      // different diagnosis after the fact.
      data: {
        ...(dto.outcome !== undefined ? { outcome: dto.outcome } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
      include: followUpInclude,
    });

    await this.audit.log({
      userId: dietitianId,
      action: "UPDATE",
      entityType: "FollowUp",
      entityId: followUp.id,
    });

    return followUp;
  }
}
