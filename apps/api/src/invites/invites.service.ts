import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import type { AcceptInviteInput } from "@repo/types";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";

const SALT_ROUNDS = 10;

@Injectable()
export class InvitesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly audit: AuditService,
  ) {}

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

  async getInvite(token: string) {
    const invite = await this.findValidInvite(token);
    const expired = invite.status !== "PENDING" || invite.expiresAt < new Date();
    return { email: invite.email, dietitianName: invite.dietitian.name, expired };
  }

  async acceptInvite(token: string, dto: AcceptInviteInput) {
    const invite = await this.findValidInvite(token);
    if (invite.status !== "PENDING" || invite.expiresAt < new Date()) {
      throw new BadRequestException("This invite is no longer valid");
    }
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
        data: { status: "ACCEPTED", acceptedAt: new Date() },
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
