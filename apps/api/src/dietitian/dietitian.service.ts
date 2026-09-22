import { ForbiddenException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomBytes } from "node:crypto";
import type { InviteRequestInput } from "@repo/types";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { EmailService } from "../email/email.service";

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
    private readonly emailService: EmailService,
    private readonly config: ConfigService,
  ) {}

  getOwnProfile(dietitianId: string) {
    return this.prisma.dietitianProfile.findUnique({
      where: { userId: dietitianId },
      select: { approvalStatus: true, licenseNumber: true, specialty: true, facility: true },
    });
  }

  async listPatients(dietitianId: string) {
    const patients = await this.prisma.patientProfile.findMany({
      where: { dietitianId },
      select: patientSelect,
      orderBy: { createdAt: "desc" },
    });

    await this.audit.log({
      userId: dietitianId,
      action: "VIEW",
      entityType: "PatientProfile",
      entityId: dietitianId,
    });

    return patients;
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

    const dietitian = await this.prisma.user.findUnique({
      where: { id: dietitianId },
      select: { name: true },
    });

    const webOrigin = this.config.get<string>("WEB_ORIGIN") || "http://localhost:3000";
    const inviteUrl = `${webOrigin}/invites/${token}`;

    this.logger.log(`Invite link for ${dto.email}: ${inviteUrl}`);

    await this.emailService.sendPatientInvite({
      to: dto.email,
      dietitianName: dietitian?.name || "Your Dietitian",
      inviteUrl,
    });

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
