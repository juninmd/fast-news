import { describe, expect, test } from "bun:test";
import {
  credibilityScore,
  dateParts,
  formatUptime,
  hostOf,
  parseCount,
  similarityPercent,
  truncate,
} from "./format";

describe("credibilityScore", () => {
  test("mirrors the 1..10 fake-news score", () => {
    expect(credibilityScore(1)).toBe(10);
    expect(credibilityScore(10)).toBe(1);
    expect(credibilityScore(6)).toBe(5);
  });

  test("an absent score is not a zero-credibility article", () => {
    expect(credibilityScore(null)).toBeNull();
    expect(credibilityScore(undefined)).toBeNull();
  });
});

describe("similarityPercent", () => {
  test("clamps to 0..100", () => {
    expect(similarityPercent(0.87)).toBe(87);
    expect(similarityPercent(1.4)).toBe(100);
    expect(similarityPercent(null)).toBeNull();
  });
});

describe("parseCount", () => {
  test("reads Postgres string counts and rejects junk", () => {
    expect(parseCount("113891")).toBe(113891);
    expect(parseCount("")).toBe(0);
    expect(parseCount(null)).toBe(0);
  });
});

describe("formatUptime", () => {  test("picks the largest two units", () => {
    expect(formatUptime(45 * 60_000)).toBe("45 min");
    expect(formatUptime(3 * 3_600_000 + 20 * 60_000)).toBe("3 h 20 min");
    expect(formatUptime(12 * 86_400_000 + 3 * 3_600_000)).toBe("12 d 3 h");
  });
});

describe("truncate", () => {
  test("collapses whitespace and adds an ellipsis only when there is excess", () => {
    expect(truncate("hello   world", 40)).toBe("hello world");
    expect(truncate("a".repeat(20), 10)).toHaveLength(10);
    expect(truncate("a".repeat(20), 10).endsWith("…")).toBe(true);
  });
});

describe("hostOf", () => {
  test("strips www and survives a bad URL", () => {
    expect(hostOf("https://www.g1.globo.com/x")).toBe("g1.globo.com");
    expect(hostOf("not a url")).toBe("");
  });
});

describe("dateParts", () => {
  test("separates the two-digit day and a short month without the trailing dot", () => {
    const parts = dateParts("2026-10-16T12:00:00.000Z");
    expect(parts.day).toMatch(/^\d{2}$/);
    expect(parts.month.length).toBeGreaterThan(0);
    expect(parts.month.endsWith(".")).toBe(false);
  });

  test("an absent or invalid date is empty, not NaN", () => {
    expect(dateParts(null)).toEqual({ day: "", month: "" });
    expect(dateParts("nope")).toEqual({ day: "", month: "" });
  });
});
