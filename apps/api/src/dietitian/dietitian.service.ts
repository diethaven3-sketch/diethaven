import { ForbiddenException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { randomBytes } from "node:crypto";
import type { InviteRequestInput } from "@repo/types";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const patientSelect = {
  id: true,
  userId: true,
  dietitianId: true,
  dateOfBirth: true,
  sex: true,
  contact: true,
  consentStatus: true,
  createdAt: true,
  user: { select: { id: true, name: true, email: true, phone: true } },
} as const;

@Injectable()
export class DietitianService {
  private readonly logger = new Logger(DietitianService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  getOwnProfile(dietitianId: string) {
    return this.prisma.dietitianProfile.findUnique({
      where: { userId: dietitianId },
      select: { approvalStatus: true, licenseNumber: true, specialty: true, facility: true },
    });
  }

  listPatients(dietitianId: string) {
    return this.prisma.patientProfile.findMany({
      where: { dietitianId },
      select: patientSelect,
      orderBy: { createdAt: "desc" },
    });
  }

  async getPatient(dietitianId: string, patientUserId: string) {
    const patient = await this.prisma.patientProfile.findUnique({
      where: { userId: patientUserId },
      select: patientSelect,
    });
    if (!patient) {
      throw new NotFoundException("Patient not found");
    }
    if (patient.dietitianId !== dietitianId) {
      throw new ForbiddenException("You do not have access to this patient");
    }

    await this.audit.log({
      userId: dietitianId,
      action: "VIEW",
      entityType: "PatientProfile",
      entityId: patient.id,
    });

    return patient;
  }

  async requestInvite(dietitianId: string, dto: InviteRequestInput) {
    const token = randomBytes(24).toString("hex");
    const invite = await this.prisma.invite.create({
      data: {
        token,
        email: dto.email,
        dietitianId,
        expiresAt: new Date(Date.now() + INVITE_TTL_MS),
      },
    });

    this.logger.log(`Invite link for ${dto.email}: /invites/${token}`);

    return {
      id: invite.id,
      email: invite.email,
      expiresAt: invite.expiresAt,
      ...(process.env.NODE_ENV === "development" ? { devToken: token } : {}),
    };
  }

  listInvites(dietitianId: string) {
    return this.prisma.invite.findMany({
      where: { dietitianId },
      orderBy: { createdAt: "desc" },
    });
  }
}
