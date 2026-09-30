import { Test } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { bmiCategory, buildDietitianOverview, type Meal, type OverviewInput } from "@repo/types";
import { DietitianService } from "./dietitian.service";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { EmailService } from "../email/email.service";

const now = new Date("2026-09-30T12:00:00.000Z");
const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);

const patient = (userId: string, name: string) => ({
  userId,
  dateOfBirth: "1980-01-01T00:00:00.000Z",
  sex: "FEMALE",
  createdAt: daysAgo(30),
  user: { name, email: `${userId}@example.com` },
});

const meals: Meal[] = [
  {
    mealType: "LUNCH",
    time: "13:00",
    items: [
      {
        foodExchangeItemId: "rice",
        foodName: "Rice",
        exchangeGroup: "STARCHES" as const,
        portionSize: "1/3 cup",
        exchanges: 2,
      },
    ],
  },
];

function input(overrides: Partial<OverviewInput> = {}): OverviewInput {
  return {
    now,
    patients: [patient("p1", "Ada"), patient("p2", "Bola")],
    pendingInvites: 1,
    assessments: [],
    activeDiagnosisCounts: new Map(),
    activeInterventions: [],
    latestFollowUps: [],
    foodLogs: [],
    lastLogAt: new Map(),
    ...overrides,
  };
}

describe("buildDietitianOverview", () => {
  it("classifies BMI with WHO adult cut-offs", () => {
    expect(bmiCategory(18.4)).toBe("UNDERWEIGHT");
    expect(bmiCategory(18.5)).toBe("HEALTHY");
    expect(bmiCategory(25)).toBe("OVERWEIGHT");
    expect(bmiCategory(30)).toBe("OBESE");
  });

  it("derives weight change and BMI category from anthropometric assessments", () => {
    const overview = buildDietitianOverview(
      input({
        assessments: [
          { patientId: "p1", domain: "ANTHROPOMETRIC", date: daysAgo(20), domainData: { height: 160, weight: 80, bmi: 31.3 } },
          { patientId: "p1", domain: "ANTHROPOMETRIC", date: daysAgo(2), domainData: { height: 160, weight: 76.5, bmi: 29.9 } },
        ],
      }),
    );
    const ada = overview.patients.find((p) => p.userId === "p1")!;
    expect(ada.latestWeight).toBe(76.5);
    expect(ada.weightChange).toBe(-3.5);
    expect(ada.bmiCategory).toBe("OVERWEIGHT");
    expect(overview.bmiDistribution.find((d) => d.category === "OVERWEIGHT")?.patients).toBe(1);
  });

  it("flags a patient with no assessment and no diary entries", () => {
    const overview = buildDietitianOverview(input());
    expect(overview.patients[0]!.attention).toEqual(["NO_ASSESSMENT", "NEVER_LOGGED"]);
    expect(overview.totals.needsAttention).toBe(2);
  });

  it("flags a logging gap, low adherence, abnormal labs and a worsened visit", () => {
    const overview = buildDietitianOverview(
      input({
        assessments: [
          { patientId: "p1", domain: "BIOCHEMICAL", date: daysAgo(5), domainData: { values: [{ marker: "HBA1C", value: 8.2 }] } },
        ],
        activeInterventions: [{ patientId: "p1", meals }],
        latestFollowUps: [{ patientId: "p1", date: daysAgo(4), outcome: "WORSENED" }],
        foodLogs: [
          { patientId: "p1", date: daysAgo(5), items: [{ foodName: "Rice", exchangeGroup: "STARCHES" as const, exchanges: 0.5 }] },
        ],
        lastLogAt: new Map([["p1", daysAgo(5)]]),
      }),
    );
    const ada = overview.patients.find((p) => p.userId === "p1")!;
    expect(ada.adherence7).toBe(25);
    expect(ada.labsOutOfRange).toEqual(["HbA1c"]);
    expect(ada.attention).toEqual(["LOGGING_GAP", "LOW_ADHERENCE", "LABS_OUT_OF_RANGE", "WORSENED"]);
    expect(overview.outcomeDistribution.find((o) => o.outcome === "WORSENED")?.patients).toBe(1);
  });

  it("leaves adherence null without a meal plan rather than scoring it 0", () => {
    const overview = buildDietitianOverview(
      input({
        foodLogs: [{ patientId: "p1", date: daysAgo(0), items: [{ foodName: "Rice", exchangeGroup: "STARCHES" as const, exchanges: 1 }] }],
        lastLogAt: new Map([["p1", daysAgo(0)]]),
      }),
    );
    const ada = overview.patients.find((p) => p.userId === "p1")!;
    expect(ada.adherence7).toBeNull();
    expect(ada.attention).not.toContain("LOW_ADHERENCE");
  });

  it("counts distinct patients per day across a 14-day window", () => {
    const overview = buildDietitianOverview(
      input({
        foodLogs: [
          { patientId: "p1", date: daysAgo(0), items: [] },
          { patientId: "p1", date: daysAgo(0), items: [] },
          { patientId: "p2", date: daysAgo(0), items: [] },
          { patientId: "p2", date: daysAgo(1), items: [] },
        ],
      }),
    );
    expect(overview.loggingActivity).toHaveLength(14);
    expect(overview.loggingActivity.at(-1)).toEqual({ date: "2026-09-30", patients: 2, entries: 3 });
    expect(overview.loggingActivity.at(-2)?.patients).toBe(1);
    expect(overview.totals.loggedToday).toBe(2);
  });
});

describe("DietitianService.getOverview", () => {
  const prisma = {
    patientProfile: { findMany: jest.fn() },
    invite: { count: jest.fn() },
    assessment: { findMany: jest.fn() },
    diagnosis: { groupBy: jest.fn() },
    intervention: { findMany: jest.fn() },
    followUp: { findMany: jest.fn() },
    foodLog: { findMany: jest.fn(), groupBy: jest.fn() },
  };
  const audit = { log: jest.fn() };
  let service: DietitianService;

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma.patientProfile.findMany.mockResolvedValue([patient("p1", "Ada")]);
    prisma.invite.count.mockResolvedValue(0);
    prisma.assessment.findMany.mockResolvedValue([]);
    prisma.diagnosis.groupBy.mockResolvedValue([]);
    prisma.intervention.findMany.mockResolvedValue([]);
    prisma.followUp.findMany.mockResolvedValue([]);
    prisma.foodLog.findMany.mockResolvedValue([]);
    prisma.foodLog.groupBy.mockResolvedValue([]);

    const module = await Test.createTestingModule({
      providers: [
        DietitianService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
        { provide: EmailService, useValue: {} },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();
    service = module.get(DietitianService);
  });

  it("scopes every clinical query to the dietitian's own linked patients", async () => {
    await service.getOverview("dietitian-a", now);

    expect(prisma.patientProfile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { dietitianId: "dietitian-a" } }),
    );
    for (const call of [
      prisma.assessment.findMany,
      prisma.diagnosis.groupBy,
      prisma.intervention.findMany,
      prisma.followUp.findMany,
      prisma.foodLog.findMany,
      prisma.foodLog.groupBy,
    ]) {
      expect(call.mock.calls[0][0].where.patientId).toEqual({ in: ["p1"] });
    }
  });

  it("audits the views it performs", async () => {
    await service.getOverview("dietitian-a", now);
    const types = audit.log.mock.calls.map(([entry]) => entry.entityType);
    expect(types).toEqual(["PatientProfile", "Assessment", "FoodLog"]);
  });
});
