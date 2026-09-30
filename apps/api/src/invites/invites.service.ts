import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { randomInt } from "node:crypto";
import {
  maskEmail,
  type AcceptInviteInput,
  type InvitePreview,
  type InviteVerificationSent,
} from "@repo/types";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { EmailService } from "../email/email.service";

const SALT_ROUNDS = 10;

/** How long an emailed verification code stays valid. */
export const VERIFICATION_TTL_MS = 10 * 60 * 1000;
/** Minimum gap between two codes for the same invite. */
export const VERIFICATION_RESEND_MS = 60 * 1000;
/** Wrong guesses allowed per code before it is burned. */
export const MAX_VERIFICATION_ATTEMPTS = 5;
/**
 * Codes an invite can ever be sent. With the per-code attempt cap this bounds
 * guessing at 25 tries against a million-code space for the invite's lifetime.
 */
export const MAX_VERIFICATION_SENDS = 5;

const INVALID_CODE = "That verification code is incorrect or has expired. Request a new one and try again.";

@Injectable()
export class InvitesService {
  private readonly logger = new Logger(InvitesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly audit: AuditService,
    private readonly emailService: EmailService,
  ) {}

  private isUsable(invite: { status: string; expiresAt: Date }) {
    return invite.status === "PENDING" && invite.expiresAt >= new Date();
  }

  private async findValidInvite(token: string) {
    const invite = await this.prisma.invite.findUnique({
      where: { token },
      include: { dietitian: { select: { name: true } } },
    });
    if (!invite) {
      throw new NotFoundException("Invite not found");
    }
    return invite;
  }

  async getInvite(token: string): Promise<InvitePreview> {
    const invite = await this.findValidInvite(token);
    return {
      maskedEmail: maskEmail(invite.email),
      dietitianName: invite.dietitian.name,
      expired: !this.isUsable(invite),
    };
  }

  /**
   * Emails a one-time code to the invited address. Accepting the invite
   * requires it, which proves the person holding the link also controls the
   * inbox — a forwarded or leaked link on its own is not enough.
   */
  async sendVerification(token: string): Promise<InviteVerificationSent & { devCode?: string }> {
    const invite = await this.findValidInvite(token);
    if (!this.isUsable(invite)) {
      throw new BadRequestException("This invite is no longer valid");
    }

    const now = Date.now();
    if (invite.verificationSentAt && now - invite.verificationSentAt.getTime() < VERIFICATION_RESEND_MS) {
      const wait = Math.ceil((VERIFICATION_RESEND_MS - (now - invite.verificationSentAt.getTime())) / 1000);
      throw new HttpException(`Please wait ${wait} seconds before requesting another code.`, HttpStatus.TOO_MANY_REQUESTS);
    }
    if (invite.verificationSendCount >= MAX_VERIFICATION_SENDS) {
      throw new HttpException(
        "Too many codes requested for this invite. Ask your dietitian to send you a new invite.",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    await this.prisma.invite.update({
      where: { id: invite.id },
      data: {
        verificationHash: await bcrypt.hash(code, SALT_ROUNDS),
        verificationExpiresAt: new Date(now + VERIFICATION_TTL_MS),
        verificationSentAt: new Date(now),
        verificationAttempts: 0,
        verificationSendCount: { increment: 1 },
      },
    });

    if (process.env.NODE_ENV === "development") {
      this.logger.log(`Invite verification code for ${invite.email}: ${code}`);
    }
    await this.emailService.sendOtp({
      to: invite.email,
      code,
      heading: "Confirm your email",
      intro: `Enter this code in the DietHaven app to accept ${invite.dietitian.name}'s invite:`,
      validFor: "10 minutes",
    });

    return {
      maskedEmail: maskEmail(invite.email),
      resendAfterSeconds: VERIFICATION_RESEND_MS / 1000,
      ...(process.env.NODE_ENV === "development" ? { devCode: code } : {}),
    };
  }

  /** Throws unless `code` matches the invite's current, unexpired, unburned code. */
  private async checkVerificationCode(invite: { id: string; verificationHash: string | null; verificationExpiresAt: Date | null }, code: string) {
    if (!invite.verificationHash || !invite.verificationExpiresAt || invite.verificationExpiresAt < new Date()) {
      throw new BadRequestException(INVALID_CODE);
    }
    // Count the attempt atomically *before* comparing, so parallel requests
    // can't each squeeze a guess in under the cap.
    const counted = await this.prisma.invite.updateMany({
      where: { id: invite.id, verificationAttempts: { lt: MAX_VERIFICATION_ATTEMPTS } },
      data: { verificationAttempts: { increment: 1 } },
    });
    if (counted.count === 0) {
      throw new BadRequestException(INVALID_CODE);
    }
    if (!(await bcrypt.compare(code, invite.verificationHash))) {
      throw new BadRequestException(INVALID_CODE);
    }
  }

  async acceptInvite(token: string, dto: AcceptInviteInput) {
    const invite = await this.findValidInvite(token);
    if (!this.isUsable(invite)) {
      throw new BadRequestException("This invite is no longer valid");
    }
    await this.checkVerificationCode(invite, dto.verificationCode);
    // Belt-and-suspenders: the zod schema already requires `consentAccepted: true`,
    // but consent capture is non-negotiable (CLAUDE.md §8), so it's re-checked here too.
    if (dto.consentAccepted !== true) {
      throw new BadRequestException("Consent is required to complete registration");
    }

    const existing = await this.prisma.user.findUnique({ where: { email: invite.email } });
    if (existing) {
      throw new ConflictException("An account with this email already exists");
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const patientProfile = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          role: "PATIENT",
          name: dto.name,
          email: invite.email,
          phone: dto.phone,
          passwordHash,
        },
      });
      const profile = await tx.patientProfile.create({
        data: {
          userId: user.id,
          dietitianId: invite.dietitianId,
          dateOfBirth: new Date(dto.dateOfBirth),
          sex: dto.sex,
          contact: dto.contact,
          consentStatus: true,
          consentGivenAt: new Date(),
        },
      });
      await tx.invite.update({
        where: { id: invite.id },
        data: { status: "ACCEPTED", acceptedAt: new Date(), verificationHash: null, verificationExpiresAt: null },
      });
      return { ...profile, user };
    });

    await this.audit.log({
      userId: patientProfile.userId,
      action: "CREATE",
      entityType: "PatientProfile",
      entityId: patientProfile.id,
    });

    const accessToken = await this.jwt.signAsync({
      sub: patientProfile.user.id,
      role: patientProfile.user.role,
      email: patientProfile.user.email,
    });
    return { accessToken };
  }
}
