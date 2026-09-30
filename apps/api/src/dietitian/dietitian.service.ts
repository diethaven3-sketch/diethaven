import { ForbiddenException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomBytes } from "node:crypto";
import {
  OVERVIEW_WINDOW_DAYS,
  buildDietitianOverview,
  type InviteRequestInput,
  type Meal,
  type OutcomeStatus,
} from "@repo/types";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { EmailService } from "../email/email.service";
import { primaryWebOrigin } from "../web-origin";

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

  /**
   * Caseload summary for the dashboard. Reads only this dietitian's linked
   * patients, and audits the view of each clinical entity type it touches.
   */
  async getOverview(dietitianId: string, now = new Date()) {
    const patients = await this.prisma.patientProfile.findMany({
      where: { dietitianId },
      select: patientSelect,
      orderBy: { createdAt: "desc" },
    });
    const ids = patients.map((p) => p.userId);
    const windowStart = new Date(now.getTime() - OVERVIEW_WINDOW_DAYS * 24 * 60 * 60 * 1000);

    const [pendingInvites, assessments, diagnosisCounts, interventions, followUps, foodLogs, lastLogs] =
      await Promise.all([
        this.prisma.invite.count({ where: { dietitianId, status: "PENDING", expiresAt: { gt: now } } }),
        this.prisma.assessment.findMany({
          where: { patientId: { in: ids } },
          select: { patientId: true, domain: true, date: true, domainData: true },
        }),
        this.prisma.diagnosis.groupBy({
          by: ["patientId"],
          where: { patientId: { in: ids }, dietitianId, status: "ACTIVE" },
          _count: { _all: true },
        }),
        this.prisma.intervention.findMany({
          where: { patientId: { in: ids }, dietitianId, status: "ACTIVE" },
          select: { patientId: true, mealPlan: { select: { meals: true } } },
          orderBy: { createdAt: "desc" },
        }),
        this.prisma.followUp.findMany({
          where: { patientId: { in: ids }, dietitianId },
          select: { patientId: true, date: true, outcome: true },
          orderBy: { date: "desc" },
          distinct: ["patientId"],
        }),
        this.prisma.foodLog.findMany({
          where: { patientId: { in: ids }, date: { gte: windowStart } },
          select: { patientId: true, date: true, items: true },
        }),
        this.prisma.foodLog.groupBy({
          by: ["patientId"],
          where: { patientId: { in: ids } },
          _max: { date: true },
        }),
      ]);

    for (const entityType of ["PatientProfile", "Assessment", "FoodLog"]) {
      await this.audit.log({ userId: dietitianId, action: "VIEW", entityType, entityId: dietitianId });
    }

    return buildDietitianOverview({
      now,
      patients,
      pendingInvites,
      assessments,
      activeDiagnosisCounts: new Map(diagnosisCounts.map((d) => [d.patientId, d._count._all])),
      activeInterventions: interventions.map((i) => ({
        patientId: i.patientId,
        meals: (i.mealPlan?.meals as Meal[] | undefined) ?? null,
      })),
      latestFollowUps: followUps.map((f) => ({ ...f, outcome: f.outcome as OutcomeStatus })),
      foodLogs,
      lastLogAt: new Map(
        lastLogs.filter((l) => l._max.date).map((l) => [l.patientId, l._max.date as Date]),
      ),
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

    const dietitian = await this.prisma.user.findUnique({
      where: { id: dietitianId },
      select: { name: true },
    });

    const webOrigin = primaryWebOrigin(this.config.get<string>("WEB_ORIGIN"));
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
