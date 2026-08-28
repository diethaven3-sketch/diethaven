import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";

const linkedDietitianSelect = {
  id: true,
  dietitian: {
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      dietitianProfile: { select: { specialty: true, facility: true } },
    },
  },
} as const;

@Injectable()
export class PatientService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async getLinkedDietitian(patientId: string) {
    const profile = await this.prisma.patientProfile.findUnique({
      where: { userId: patientId },
      select: linkedDietitianSelect,
    });
    if (!profile) {
      throw new NotFoundException("Patient profile not found");
    }

    await this.audit.log({
      userId: patientId,
      action: "VIEW",
      entityType: "PatientProfile",
      entityId: profile.id,
    });

    return profile.dietitian;
  }

  async getOwnAssessments(patientId: string) {
    const assessments = await this.prisma.assessment.findMany({
      where: { patientId, domain: "ANTHROPOMETRIC" },
      orderBy: { date: "desc" },
    });

    await this.audit.log({
      userId: patientId,
      action: "VIEW",
      entityType: "Assessment",
      entityId: patientId,
    });

    return assessments;
  }
}
