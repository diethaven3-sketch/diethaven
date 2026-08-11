import { ConflictException, Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import type {
  ChangePasswordInput,
  DietitianRegisterInput,
  ForgotPasswordInput,
  LoginInput,
  OtpRequestInput,
  OtpVerifyInput,
  PatientRegisterInput,
  ResetPasswordInput,
  UpdateProfileInput,
} from "@repo/types";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";

const OTP_TTL_MS = 5 * 60 * 1000;
const RESET_PASSWORD_TTL_MS = 15 * 60 * 1000;
const SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly audit: AuditService,
  ) {}

  private signToken(user: { id: string; role: string; email: string }) {
    return this.jwt.signAsync({ sub: user.id, role: user.role, email: user.email });
  }

  async registerDietitian(dto: DietitianRegisterInput) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException("An account with this email already exists");
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          role: "DIETITIAN",
          name: dto.name,
          email: dto.email,
          phone: dto.phone,
          passwordHash,
        },
      });
      await tx.dietitianProfile.create({
        data: {
          userId: created.id,
          licenseNumber: dto.licenseNumber,
          specialty: dto.specialty,
          facility: dto.facility,
        },
      });
      return created;
    });

    const accessToken = await this.signToken(user);
    return { accessToken };
  }

  async registerPatient(dto: PatientRegisterInput) {
    if (dto.consentAccepted !== true) {
      throw new UnauthorizedException("Consent is required to complete registration");
    }

    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException("An account with this email already exists");
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const patientProfile = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          role: "PATIENT",
          name: dto.name,
          email: dto.email,
          phone: dto.phone,
          passwordHash,
        },
      });
      const profile = await tx.patientProfile.create({
        data: {
          userId: user.id,
          dietitianId: null,
          dateOfBirth: new Date(dto.dateOfBirth),
          sex: dto.sex,
          contact: dto.contact,
          consentStatus: true,
          consentGivenAt: new Date(),
        },
      });
      return { ...profile, user };
    });

    await this.audit.log({
      userId: patientProfile.userId,
      action: "CREATE",
      entityType: "PatientProfile",
      entityId: patientProfile.id,
    });

    const accessToken = await this.signToken(patientProfile.user);
    return { accessToken };
  }

  async login(dto: LoginInput) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const accessToken = await this.signToken(user);
    return { accessToken };
  }

  async requestOtp(dto: OtpRequestInput) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    // Same generic response whether the account doesn't exist or isn't a
    // patient, so this endpoint can't be used to enumerate accounts.
    if (!user || user.role !== "PATIENT") {
      return { message: "If that account exists, an OTP has been sent" };
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const otpHash = await bcrypt.hash(code, SALT_ROUNDS);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { otpHash, otpExpiresAt: new Date(Date.now() + OTP_TTL_MS) },
    });

    this.logger.log(`OTP for ${user.email}: ${code}`);

    return {
      message: "If that account exists, an OTP has been sent",
      ...(process.env.NODE_ENV === "development" ? { devOtp: code } : {}),
    };
  }

  async verifyOtp(dto: OtpVerifyInput) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || user.role !== "PATIENT" || !user.otpHash || !user.otpExpiresAt) {
      throw new UnauthorizedException("Invalid or expired code");
    }
    if (user.otpExpiresAt < new Date()) {
      throw new UnauthorizedException("Invalid or expired code");
    }

    const codeMatches = await bcrypt.compare(dto.code, user.otpHash);
    if (!codeMatches) {
      throw new UnauthorizedException("Invalid or expired code");
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { otpHash: null, otpExpiresAt: null },
    });

    const accessToken = await this.signToken(user);
    return { accessToken };
  }

  getProfile(userId: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true },
    });
  }

  updateProfile(userId: string, dto: UpdateProfileInput) {
    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
      select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true },
    });
  }

  async forgotPassword(dto: ForgotPasswordInput) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    // Generic response whether or not the account exists, so this endpoint
    // can't be used to enumerate accounts (same pattern as requestOtp).
    if (!user) {
      return { message: "If that account exists, a reset code has been sent" };
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const resetPasswordHash = await bcrypt.hash(code, SALT_ROUNDS);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { resetPasswordHash, resetPasswordExpiresAt: new Date(Date.now() + RESET_PASSWORD_TTL_MS) },
    });

    this.logger.log(`Password reset code for ${user.email}: ${code}`);

    return {
      message: "If that account exists, a reset code has been sent",
      ...(process.env.NODE_ENV === "development" ? { devResetCode: code } : {}),
    };
  }

  async resetPassword(dto: ResetPasswordInput) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !user.resetPasswordHash || !user.resetPasswordExpiresAt) {
      throw new UnauthorizedException("Invalid or expired code");
    }
    if (user.resetPasswordExpiresAt < new Date()) {
      throw new UnauthorizedException("Invalid or expired code");
    }

    const codeMatches = await bcrypt.compare(dto.code, user.resetPasswordHash);
    if (!codeMatches) {
      throw new UnauthorizedException("Invalid or expired code");
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, SALT_ROUNDS);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, resetPasswordHash: null, resetPasswordExpiresAt: null },
    });

    return { message: "Password reset" };
  }

  async changePassword(userId: string, dto: ChangePasswordInput) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const currentMatches = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!currentMatches) {
      throw new UnauthorizedException("Current password is incorrect");
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, SALT_ROUNDS);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });

    return { message: "Password updated" };
  }
}
