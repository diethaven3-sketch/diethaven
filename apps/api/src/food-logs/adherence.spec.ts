import { adherenceByDay, averageAdherence, dayAdherence, plannedExchanges } from "@repo/types";

/**
 * Covers the adherence maths in @repo/types, which has no test runner of its
 * own — same arrangement as monitoring-trends.spec.ts. An adherence percentage
 * shown to a dietitian needs to be defensible, so the edge cases are pinned
 * down here.
 */
describe("adherence", () => {
  /** A food as it appears on a prescribed meal plan. */
  const planned = (exchangeGroup: string, exchanges: number) => ({
    foodExchangeItemId: `food-${exchangeGroup}`,
    foodName: "food",
    exchangeGroup: exchangeGroup as never,
    portionSize: "1 portion",
    exchanges,
  });

  /** A food as a patient logs it — id and portion are optional there. */
  const item = (exchangeGroup: string, exchanges: number) => ({
    foodName: "food",
    exchangeGroup: exchangeGroup as never,
    exchanges,
  });

  const plan = plannedExchanges([
    { mealType: "BREAKFAST", items: [planned("STARCHES", 2), planned("FRUITS", 1)] },
    {
      mealType: "LUNCH",
      items: [planned("STARCHES", 2), planned("VEGETABLES", 2), planned("PROTEINS", 2)],
    },
  ]);

  describe("plannedExchanges", () => {
    it("totals each exchange group across every meal in the plan", () => {
      expect(plan.get("STARCHES")).toBe(4);
      expect(plan.get("VEGETABLES")).toBe(2);
      expect(plan.get("PROTEINS")).toBe(2);
      expect(plan.get("FRUITS")).toBe(1);
    });
  });

  describe("dayAdherence", () => {
    it("scores a day that matches the plan exactly at 100%", () => {
      const { percent } = dayAdherence(plan, [
        item("STARCHES", 4),
        item("VEGETABLES", 2),
        item("PROTEINS", 2),
        item("FRUITS", 1),
      ]);

      expect(percent).toBe(100);
    });

    it("gives partial credit proportional to the planned exchanges met", () => {
      // 4 of 9 planned exchanges accounted for.
      const { percent } = dayAdherence(plan, [item("STARCHES", 4)]);

      expect(percent).toBe(44);
    });

    it("does not let overeating one group offset missing another", () => {
      // Ten starches against four planned still credits only four.
      const { percent } = dayAdherence(plan, [item("STARCHES", 10)]);

      expect(percent).toBe(44);
    });

    it("ignores logged groups the plan never asked for", () => {
      const { percent } = dayAdherence(plan, [item("STARCHES", 4), item("FATS", 5)]);

      expect(percent).toBe(44);
    });

    it("returns null rather than 0 when nothing countable was logged", () => {
      // "No data" and "followed none of the plan" must not look the same.
      expect(dayAdherence(plan, []).percent).toBeNull();
      expect(dayAdherence(plan, [{ foodName: "jollof rice" }]).percent).toBeNull();
    });

    it("returns null when there is no plan to measure against", () => {
      expect(dayAdherence(new Map(), [item("STARCHES", 2)]).percent).toBeNull();
    });

    it("reports planned against logged for every group either side mentions", () => {
      const { byGroup } = dayAdherence(plan, [item("STARCHES", 3), item("FATS", 1)]);

      expect(byGroup).toContainEqual({ group: "STARCHES", planned: 4, logged: 3 });
      expect(byGroup).toContainEqual({ group: "FATS", planned: 0, logged: 1 });
      expect(byGroup).toContainEqual({ group: "VEGETABLES", planned: 2, logged: 0 });
    });
  });

  describe("adherenceByDay", () => {
    it("groups entries by calendar date and returns newest first", () => {
      const days = adherenceByDay(
        [
          { date: "2026-09-01T08:00:00.000Z", items: [item("STARCHES", 2)] },
          { date: "2026-09-01T13:00:00.000Z", items: [item("STARCHES", 2)] },
          { date: "2026-09-03T08:00:00.000Z", items: [item("VEGETABLES", 2)] },
        ],
        plan,
      );

      expect(days.map((d) => d.date)).toEqual(["2026-09-03", "2026-09-01"]);
      // Both of the 1 September entries count toward that one day.
      expect(days[1]).toMatchObject({ date: "2026-09-01", entries: 2, percent: 44 });
    });
  });

  describe("averageAdherence", () => {
    it("averages only the days that produced a score", () => {
      const days = [
        { date: "2026-09-03", percent: 100, entries: 1, byGroup: [] },
        { date: "2026-09-02", percent: null, entries: 0, byGroup: [] },
        { date: "2026-09-01", percent: 50, entries: 1, byGroup: [] },
      ];

      expect(averageAdherence(days)).toBe(75);
    });

    it("returns null when no day produced a score", () => {
      expect(averageAdherence([{ date: "2026-09-01", percent: null, entries: 0, byGroup: [] }])).toBeNull();
    });
  });
});
