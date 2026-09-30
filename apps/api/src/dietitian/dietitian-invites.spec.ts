import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { DietitianService } from "./dietitian.service";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { EmailService } from "../email/email.service";

describe("DietitianService invites", () => {
  const now = new Date("2026-09-30T12:00:00.000Z");
  const prisma = {
    invite: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    user: { findUnique: jest.fn() },
  };
  const audit = { log: jest.fn() };
  const email = { sendPatientInvite: jest.fn() };
  let service: DietitianService;

  const row = (overrides: Record<string, unknown>) => ({
    id: "invite-1",
    token: "tok123",
    email: "ada@example.com",
    dietitianId: "dietitian-a",
    status: "PENDING",
    createdAt: new Date("2026-09-28T00:00:00.000Z"),
    expiresAt: new Date("2026-10-05T00:00:00.000Z"),
    acceptedAt: null,
    ...overrides,
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        DietitianService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
        { provide: EmailService, useValue: email },
        { provide: ConfigService, useValue: { get: () => "https://app.example.com/,https://other.example.com" } },
      ],
    }).compile();
    service = module.get(DietitianService);
  });

  it("returns a shareable link when an invite is created", async () => {
    prisma.invite.create.mockImplementation(({ data }) => ({ id: "invite-1", ...data }));
    prisma.user.findUnique.mockResolvedValue({ name: "Dr Obi" });

    const result = await service.requestInvite("dietitian-a", { email: "ada@example.com" });

    expect(result.inviteUrl).toBe(`https://app.example.com/invites/${result.code}`);
    expect(email.sendPatientInvite).toHaveBeenCalledWith(expect.objectContaining({ inviteUrl: result.inviteUrl }));
  });

  it("only exposes links for invites that can still be accepted", async () => {
    prisma.invite.findMany.mockResolvedValue([
      row({ id: "pending" }),
      row({ id: "lapsed", expiresAt: new Date("2026-09-29T00:00:00.000Z") }),
      row({ id: "accepted", status: "ACCEPTED", acceptedAt: new Date("2026-09-29T00:00:00.000Z") }),
    ]);

    const list = await service.listInvites("dietitian-a", now);

    expect(prisma.invite.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { dietitianId: "dietitian-a" } }));
    expect(list.map((i) => [i.id, i.status, i.inviteUrl])).toEqual([
      ["pending", "PENDING", "https://app.example.com/invites/tok123"],
      ["lapsed", "EXPIRED", null],
      ["accepted", "ACCEPTED", null],
    ]);
    expect(list.every((i) => i.code === null || i.status === "PENDING")).toBe(true);
  });

  it("refuses to revoke another dietitian's invite", async () => {
    prisma.invite.findUnique.mockResolvedValue(row({ dietitianId: "dietitian-b" }));

    await expect(service.revokeInvite("dietitian-a", "invite-1")).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.invite.update).not.toHaveBeenCalled();
  });

  it("refuses to revoke an invite that was already accepted", async () => {
    prisma.invite.findUnique.mockResolvedValue(row({ status: "ACCEPTED" }));

    await expect(service.revokeInvite("dietitian-a", "invite-1")).rejects.toBeInstanceOf(BadRequestException);
  });

  it("expires a pending invite and audits the change", async () => {
    prisma.invite.findUnique.mockResolvedValue(row({}));

    await service.revokeInvite("dietitian-a", "invite-1");

    expect(prisma.invite.update).toHaveBeenCalledWith({ where: { id: "invite-1" }, data: { status: "EXPIRED" } });
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: "UPDATE", entityType: "Invite", entityId: "invite-1" }),
    );
  });
});
