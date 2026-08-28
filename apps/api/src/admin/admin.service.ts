import { Injectable, NotFoundException } from "@nestjs/common";
import type { ListDietitiansQuery, UpdateDietitianStatusInput } from "@repo/types";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";

const dietitianUserSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  createdAt: true,
  _count: { select: { patientsAsDietitian: true } },
} as const;

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  listDietitians(status?: ListDietitiansQuery["status"]) {
    return this.prisma.dietitianProfile.findMany({
      where: status ? { approvalStatus: status } : undefined,
      include: { user: { select: dietitianUserSelect } },
      orderBy: { createdAt: "desc" },
    });
  }

  async getDietitianDetail(adminId: string, id: string) {
    const profile = await this.prisma.dietitianProfile.findUnique({
      where: { id },
      include: { user: { select: dietitianUserSelect } },
    });
    if (!profile) {
      throw new NotFoundException("Dietitian not found");
    }

    const patients = await this.prisma.patientProfile.findMany({
      where: { dietitianId: profile.userId },
      select: {
        userId: true,
        createdAt: true,
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    await this.audit.log({
      userId: adminId,
      action: "VIEW",
      entityType: "PatientProfile",
      entityId: profile.userId,
    });

    return {
      ...profile,
      patients: patients.map((p) => ({
        id: p.userId,
        name: p.user.name,
        email: p.user.email,
        linkedAt: p.createdAt,
      })),
    };
  }

  async updateDietitianStatus(dietitianProfileId: string, dto: UpdateDietitianStatusInput) {
    const profile = await this.prisma.dietitianProfile.findUnique({ where: { id: dietitianProfileId } });
    if (!profile) {
      throw new NotFoundException("Dietitian not found");
    }
    return this.prisma.dietitianProfile.update({
      where: { id: dietitianProfileId },
      data: { approvalStatus: dto.status },
      include: { user: { select: dietitianUserSelect } },
    });
  }
}
