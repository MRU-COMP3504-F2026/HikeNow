import { describe, expect, it } from "vitest";
import { getReviewDateRange, isReviewDatePeriod } from "@/app/lib/review-date";

describe("review date periods", () => {
  const now = new Date("2026-11-15T10:00:00Z");

  it("uses inclusive calendar-day ranges for each period", () => {
    expect(getReviewDateRange("week", now)).toEqual({
      startDate: "2026-11-09",
      endDate: "2026-11-15",
    });
    expect(getReviewDateRange("month", now)).toEqual({
      startDate: "2026-10-17",
      endDate: "2026-11-15",
    });
    expect(getReviewDateRange("year", now)).toEqual({
      startDate: "2025-11-16",
      endDate: "2026-11-15",
    });
    expect(getReviewDateRange("all", now)).toBeNull();
  });

  it("handles year boundaries and leap days", () => {
    expect(getReviewDateRange("week", new Date("2024-03-01T00:00:00Z"))).toEqual({
      startDate: "2024-02-24",
      endDate: "2024-03-01",
    });
  });

  it("recognizes only supported filter values", () => {
    expect(isReviewDatePeriod("month")).toBe(true);
    expect(isReviewDatePeriod("invalid")).toBe(false);
    expect(isReviewDatePeriod(["week"])).toBe(false);
  });
});
