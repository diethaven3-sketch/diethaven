import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const [dietitiansByStatus, invitesByStatus, patientCount, assessmentCount] = await Promise.all([
      this.prisma.dietitianProfile.groupBy({ by: ["approvalStatus"], _count: true }),
      this.prisma.invite.groupBy({ by: ["status"], _count: true }),
      this.prisma.patientProfile.count(),
      this.prisma.assessment.count(),
    ]);

    return {
      dietitians: Object.fromEntries(dietitiansByStatus.map((row) => [row.approvalStatus, row._count])),
      invites: Object.fromEntries(invitesByStatus.map((row) => [row.status, row._count])),
      patientCount,
      assessmentCount,
    };
  }
}
