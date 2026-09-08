import { Injectable, NotFoundException } from "@nestjs/common";
import type { UpdatePatientProfileInput } from "@repo/types";
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

const ownProfileSelect = {
  id: true,
  dateOfBirth: true,
  sex: true,
  contact: true,
  consentStatus: true,
  consentGivenAt: true,
  createdAt: true,
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

  async getOwnProfile(patientId: string) {
    const profile = await this.prisma.patientProfile.findUnique({
      where: { userId: patientId },
      select: ownProfileSelect,
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

    return profile;
  }

  async updateOwnProfile(patientId: string, dto: UpdatePatientProfileInput) {
    // Checked up front so a missing profile surfaces as a 404 rather than a
    // Prisma "record not found" error out of update().
    const existing = await this.prisma.patientProfile.findUnique({
      where: { userId: patientId },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException("Patient profile not found");
    }

    // Only the three self-reported fields are writable. consentStatus and
    // dietitianId are not patient-editable, so they're never taken from the DTO.
    const profile = await this.prisma.patientProfile.update({
      where: { userId: patientId },
      data: {
        ...(dto.dateOfBirth !== undefined ? { dateOfBirth: new Date(dto.dateOfBirth) } : {}),
        ...(dto.sex !== undefined ? { sex: dto.sex } : {}),
        ...(dto.contact !== undefined ? { contact: dto.contact } : {}),
      },
      select: ownProfileSelect,
    });

    await this.audit.log({
      userId: patientId,
      action: "UPDATE",
      entityType: "PatientProfile",
      entityId: profile.id,
    });

    return profile;
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
