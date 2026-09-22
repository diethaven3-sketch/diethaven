import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type {
  InterventionCreateInput,
  InterventionStatus,
  InterventionUpdateInput,
  MealPlanInput,
} from "@repo/types";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";

const interventionInclude = {
  mealPlan: true,
  diagnosis: {
    select: { id: true, domain: true, problemCode: true, problem: true, etiology: true, status: true },
  },
} as const;

@Injectable()
export class InterventionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private async assertOwnership(dietitianId: string, patientId: string) {
    const patient = await this.prisma.patientProfile.findUnique({
      where: { userId: patientId },
      select: { dietitianId: true },
    });
    if (!patient) {
      throw new NotFoundException("Patient not found");
    }
    if (patient.dietitianId !== dietitianId) {
      throw new ForbiddenException("You do not have access to this patient");
    }
  }

  /**
   * The diagnosis must belong to this dietitian AND to the same patient —
   * otherwise an intervention could be hung off another patient's diagnosis.
   */
  private async assertDiagnosisFits(dietitianId: string, patientId: string, diagnosisId: string) {
    const diagnosis = await this.prisma.diagnosis.findUnique({
      where: { id: diagnosisId },
      select: { patientId: true, dietitianId: true },
    });
    if (!diagnosis) {
      throw new NotFoundException("Diagnosis not found");
    }
    if (diagnosis.dietitianId !== dietitianId || diagnosis.patientId !== patientId) {
      throw new ForbiddenException("That diagnosis does not belong to this patient");
    }
  }

  private mealPlanData(dietitianId: string, patientId: string, plan: MealPlanInput) {
    return {
      patientId,
      dietitianId,
      name: plan.name,
      meals: plan.meals,
      calorieTarget: plan.calorieTarget ?? null,
      carbsTargetG: plan.carbsTargetG ?? null,
      proteinTargetG: plan.proteinTargetG ?? null,
      fatTargetG: plan.fatTargetG ?? null,
    };
  }

  async create(dietitianId: string, dto: InterventionCreateInput) {
    await this.assertOwnership(dietitianId, dto.patientId);
    await this.assertDiagnosisFits(dietitianId, dto.patientId, dto.diagnosisId);

    // One transaction, so an intervention is never left without the meal plan
    // it was meant to carry.
    const intervention = await this.prisma.$transaction(async (tx) => {
      const mealPlan = dto.mealPlan
        ? await tx.mealPlan.create({ data: this.mealPlanData(dietitianId, dto.patientId, dto.mealPlan) })
        : null;

      return tx.intervention.create({
        data: {
          patientId: dto.patientId,
          dietitianId,
          diagnosisId: dto.diagnosisId,
          carePlanDetails: dto.carePlanDetails,
          prescription: dto.prescription ?? undefined,
          mealPlanId: mealPlan?.id ?? null,
          status: dto.status ?? "ACTIVE",
          // There are no AI features, so nothing may be recorded as AI-generated.
          aiGenerated: false,
        },
        include: interventionInclude,
      });
    });

    await this.audit.log({
      userId: dietitianId,
      action: "CREATE",
      entityType: "Intervention",
      entityId: intervention.id,
    });

    return intervention;
  }

  async listForPatient(dietitianId: string, patientId: string, status?: InterventionStatus) {
    await this.assertOwnership(dietitianId, patientId);

    const interventions = await this.prisma.intervention.findMany({
      where: { patientId, ...(status ? { status } : {}) },
      orderBy: { createdAt: "desc" },
      include: interventionInclude,
    });

    await this.audit.log({
      userId: dietitianId,
      action: "VIEW",
      entityType: "Intervention",
      entityId: patientId,
    });

    return interventions;
  }

  private async findOwned(dietitianId: string, id: string) {
    const intervention = await this.prisma.intervention.findUnique({ where: { id } });
    if (!intervention) {
      throw new NotFoundException("Intervention not found");
    }
    if (intervention.dietitianId !== dietitianId) {
      throw new ForbiddenException("You do not have access to this intervention");
    }
    return intervention;
  }

  async update(dietitianId: string, id: string, dto: InterventionUpdateInput) {
    await this.findOwned(dietitianId, id);

    const intervention = await this.prisma.intervention.update({
      where: { id },
      // Copied across explicitly: patientId, dietitianId, diagnosisId and
      // aiGenerated are not editable here. Re-pointing an intervention at a
      // different diagnosis would break the mapping the guideline requires.
      data: {
        ...(dto.carePlanDetails !== undefined ? { carePlanDetails: dto.carePlanDetails } : {}),
        ...(dto.prescription !== undefined ? { prescription: dto.prescription ?? undefined } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
      },
      include: interventionInclude,
    });

    await this.audit.log({
      userId: dietitianId,
      action: "UPDATE",
      entityType: "Intervention",
      entityId: intervention.id,
    });

    return intervention;
  }

  /** Replaces the meal plan attached to an intervention, or attaches a first one. */
  async setMealPlan(dietitianId: string, id: string, plan: MealPlanInput) {
    const existing = await this.findOwned(dietitianId, id);
    if (plan.meals.every((meal) => meal.items.length === 0)) {
      throw new BadRequestException("Add at least one food to the meal plan");
    }

    const intervention = await this.prisma.$transaction(async (tx) => {
      const mealPlan = await tx.mealPlan.create({
        data: this.mealPlanData(dietitianId, existing.patientId, plan),
      });
      const updated = await tx.intervention.update({
        where: { id },
        data: { mealPlanId: mealPlan.id },
        include: interventionInclude,
      });
      // The superseded plan is only removed once nothing points at it, so a
      // failure here can't strand the intervention without a plan.
      if (existing.mealPlanId) {
        await tx.mealPlan.delete({ where: { id: existing.mealPlanId } });
      }
      return updated;
    });

    await this.audit.log({
      userId: dietitianId,
      action: "UPDATE",
      entityType: "Intervention",
      entityId: intervention.id,
    });

    return intervention;
  }
}
