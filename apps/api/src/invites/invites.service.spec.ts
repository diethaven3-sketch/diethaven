import { BadRequestException, HttpException, HttpStatus } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Test } from "@nestjs/testing";
import * as bcrypt from "bcrypt";
import { InvitesService, MAX_VERIFICATION_SENDS } from "./invites.service";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { EmailService } from "../email/email.service";

describe("InvitesService verification", () => {
  const future = () => new Date(Date.now() + 60 * 60 * 1000);
  const past = () => new Date(Date.now() - 60 * 1000);

  const prisma = {
    invite: { findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
    user: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  };
  const email = { sendOtp: jest.fn() };
  let service: InvitesService;

  const invite = (overrides: Record<string, unknown> = {}) => ({
    id: "invite-1",
    token: "tok",
    email: "adaeze@example.com",
    dietitianId: "dietitian-a",
    status: "PENDING",
    expiresAt: future(),
    dietitian: { name: "Dr Obi" },
    verificationHash: null,
    verificationExpiresAt: null,
    verificationSentAt: null,
    verificationAttempts: 0,
    verificationSendCount: 0,
    ...overrides,
  });

  const acceptDto = {
    name: "Adaeze",
    password: "password123",
    dateOfBirth: "1990-01-01",
    sex: "FEMALE" as const,
    consentAccepted: true as const,
    verificationCode: "123456",
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        InvitesService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: { log: jest.fn() } },
        { provide: EmailService, useValue: email },
        { provide: JwtService, useValue: { signAsync: jest.fn().mockResolvedValue("jwt") } },
      ],
    }).compile();
    service = module.get(InvitesService);
  });

  it("masks the invited email in the public preview", async () => {
    prisma.invite.findUnique.mockResolvedValue(invite());
    const preview = await service.getInvite("tok");
    expect(preview).toEqual({ maskedEmail: "ad****@example.com", dietitianName: "Dr Obi", expired: false });
  });

  describe("sendVerification", () => {
    it("emails a 6-digit code to the invited address and stores only its hash", async () => {
      prisma.invite.findUnique.mockResolvedValue(invite());

      await service.sendVerification("tok");

      const { to, code } = email.sendOtp.mock.calls[0][0];
      expect(to).toBe("adaeze@example.com");
      expect(code).toMatch(/^\d{6}$/);
      const { data } = prisma.invite.update.mock.calls[0][0];
      expect(data.verificationHash).not.toBe(code);
      expect(await bcrypt.compare(code, data.verificationHash)).toBe(true);
      expect(data.verificationAttempts).toBe(0);
    });

    it("refuses a resend inside the cooldown", async () => {
      prisma.invite.findUnique.mockResolvedValue(invite({ verificationSentAt: new Date() }));

      const error = await service.sendVerification("tok").catch((e: unknown) => e);
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      expect(email.sendOtp).not.toHaveBeenCalled();
    });

    it("stops issuing codes once the per-invite cap is reached", async () => {
      prisma.invite.findUnique.mockResolvedValue(invite({ verificationSendCount: MAX_VERIFICATION_SENDS }));

      await expect(service.sendVerification("tok")).rejects.toBeInstanceOf(HttpException);
      expect(email.sendOtp).not.toHaveBeenCalled();
    });

    it("refuses revoked or lapsed invites", async () => {
      prisma.invite.findUnique.mockResolvedValue(invite({ status: "EXPIRED" }));
      await expect(service.sendVerification("tok")).rejects.toBeInstanceOf(BadRequestException);

      prisma.invite.findUnique.mockResolvedValue(invite({ expiresAt: past() }));
      await expect(service.sendVerification("tok")).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe("acceptInvite", () => {
    it("refuses when no code was ever requested", async () => {
      prisma.invite.findUnique.mockResolvedValue(invite());

      await expect(service.acceptInvite("tok", acceptDto)).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it("refuses an expired code", async () => {
      prisma.invite.findUnique.mockResolvedValue(
        invite({ verificationHash: await bcrypt.hash("123456", 4), verificationExpiresAt: past() }),
      );

      await expect(service.acceptInvite("tok", acceptDto)).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it("refuses a wrong code", async () => {
      prisma.invite.findUnique.mockResolvedValue(
        invite({ verificationHash: await bcrypt.hash("654321", 4), verificationExpiresAt: future() }),
      );
      prisma.invite.updateMany.mockResolvedValue({ count: 1 });

      await expect(service.acceptInvite("tok", acceptDto)).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it("refuses even the right code once attempts are used up", async () => {
      prisma.invite.findUnique.mockResolvedValue(
        invite({ verificationHash: await bcrypt.hash("123456", 4), verificationExpiresAt: future() }),
      );
      prisma.invite.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.acceptInvite("tok", acceptDto)).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it("creates the account when the code matches", async () => {
      prisma.invite.findUnique.mockResolvedValue(
        invite({ verificationHash: await bcrypt.hash("123456", 4), verificationExpiresAt: future() }),
      );
      prisma.invite.updateMany.mockResolvedValue({ count: 1 });
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.$transaction.mockResolvedValue({
        id: "profile-1",
        userId: "user-1",
        user: { id: "user-1", role: "PATIENT", email: "adaeze@example.com" },
      });

      await expect(service.acceptInvite("tok", acceptDto)).resolves.toEqual({ accessToken: "jwt" });
      expect(prisma.invite.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "invite-1", verificationAttempts: { lt: 5 } } }),
      );
    });
  });
});
