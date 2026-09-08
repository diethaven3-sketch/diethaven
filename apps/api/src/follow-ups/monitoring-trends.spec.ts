import { anthropometricTrend, labTrends, weightSummary } from "@repo/types";

/**
 * These cover the trend maths in @repo/types, which has no test runner of its
 * own. The logic is clinical — a silently wrong lab delta or a mis-sorted
 * series would mislead a dietitian at a follow-up visit — so it is exercised
 * here rather than left uncovered. Move these into packages/types if that
 * package ever gains jest.
 */
describe("monitoring trends", () => {
  const anthro = (date: string, weight: number, bmi: number) => ({
    date,
    domain: "ANTHROPOMETRIC",
    domainData: { height: 170, weight, bmi },
  });

  const labs = (date: string, testDate: string | undefined, values: unknown[]) => ({
    date,
    domain: "BIOCHEMICAL",
    domainData: { ...(testDate ? { testDate } : {}), values },
  });

  describe("anthropometricTrend", () => {
    it("returns oldest first regardless of the order it was given", () => {
      const points = anthropometricTrend([
        anthro("2026-03-01", 82, 28.4),
        anthro("2026-01-01", 88, 30.4),
        anthro("2026-02-01", 85, 29.4),
      ]);

      expect(points.map((p) => p.weight)).toEqual([88, 85, 82]);
    });

    it("ignores other assessment domains", () => {
      const points = anthropometricTrend([
        anthro("2026-01-01", 88, 30.4),
        { date: "2026-01-02", domain: "DIETARY", domainData: { usualIntake: "rice and stew" } },
      ]);

      expect(points).toHaveLength(1);
    });
  });

  describe("weightSummary", () => {
    it("reports the change from first to latest", () => {
      const summary = weightSummary(
        anthropometricTrend([anthro("2026-01-01", 88, 30.4), anthro("2026-03-01", 82, 28.4)]),
      );

      expect(summary?.weightChange).toBe(-6);
      expect(summary?.bmiChange).toBe(-2);
    });

    it("returns null with a single measurement, which has nothing to compare against", () => {
      expect(weightSummary(anthropometricTrend([anthro("2026-01-01", 88, 30.4)]))).toBeNull();
    });
  });

  describe("labTrends", () => {
    it("groups each marker into its own series, oldest first, with the change", () => {
      const trends = labTrends([
        labs("2026-03-02", "2026-03-01", [{ marker: "HBA1C", value: 7.1, flag: "HIGH" }]),
        labs("2026-01-02", "2026-01-01", [{ marker: "HBA1C", value: 8.2, flag: "HIGH" }]),
      ]);

      expect(trends).toHaveLength(1);
      expect(trends[0]?.points.map((p) => p.value)).toEqual([8.2, 7.1]);
      expect(trends[0]?.latest.value).toBe(7.1);
      expect(trends[0]?.change).toBe(-1.1);
    });

    it("carries the reference range for comparison, per the guideline", () => {
      const trends = labTrends([labs("2026-01-02", "2026-01-01", [{ marker: "HBA1C", value: 8.2 }])]);

      expect(trends[0]).toMatchObject({ unit: "%", referenceLow: 4, referenceHigh: 5.6 });
    });

    it("re-derives a missing flag rather than dropping the point", () => {
      const trends = labTrends([labs("2026-01-02", "2026-01-01", [{ marker: "FASTING_GLUCOSE", value: 140 }])]);

      expect(trends[0]?.latest.flag).toBe("HIGH");
    });

    it("dates a series by the lab's test date, falling back to when it was recorded", () => {
      const withTestDate = labTrends([labs("2026-03-09", "2026-03-01", [{ marker: "HBA1C", value: 7.1 }])]);
      const without = labTrends([labs("2026-03-09", undefined, [{ marker: "HBA1C", value: 7.1 }])]);

      expect(withTestDate[0]?.latest.date).toBe("2026-03-01");
      expect(without[0]?.latest.date).toBe("2026-03-09");
    });

    it("sorts markers currently outside their range first", () => {
      const trends = labTrends([
        labs("2026-01-02", "2026-01-01", [
          { marker: "ALBUMIN", value: 4.2, flag: "NORMAL" },
          { marker: "HBA1C", value: 8.2, flag: "HIGH" },
        ]),
      ]);

      expect(trends.map((t) => t.marker)).toEqual(["HBA1C", "ALBUMIN"]);
    });

    it("leaves a single result with no change to report", () => {
      const trends = labTrends([labs("2026-01-02", "2026-01-01", [{ marker: "HBA1C", value: 8.2 }])]);

      expect(trends[0]?.change).toBeNull();
    });

    it("skips unrecognised markers and non-numeric values", () => {
      const trends = labTrends([
        labs("2026-01-02", "2026-01-01", [
          { marker: "NOT_A_MARKER", value: 5 },
          { marker: "HBA1C", value: Number.NaN },
        ]),
      ]);

      expect(trends).toHaveLength(0);
    });
  });
});
