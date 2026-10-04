import { describe, expect, it } from "vitest";
import { calculateOwnership, checkRequirements, findMissingFields } from "@/lib/evaluation";
import { defaultProfile } from "@/lib/schemas";
import { extractFallback, researchFallback } from "@/lib/server/fallbacks";

describe("ownership estimate", () => {
  it("normalizes depreciation and fuel to a monthly amount", () => {
    const vehicle = extractFallback("2019 Toyota RAV4 SUV $20,000 with 60,000 miles and 30 MPG. Clean title.");
    const research = { ...researchFallback(vehicle), estimatedResaleValue: 10000, estimatedMpg: 30 };
    const result = calculateOwnership(vehicle, research, { ...defaultProfile, ownershipYears: 5, annualMiles: 12000, gasPrice: 3 });
    expect(result.depreciationMonthly).toBeCloseTo(166.67, 1);
    expect(result.fuelMonthly).toBe(100);
    expect(result.totalMonthly).toBeCloseTo(266.67, 1);
  });

  it("does not fabricate a complete total when MPG is missing", () => {
    const vehicle = extractFallback("2019 Toyota RAV4 SUV priced at $20,000 with 60,000 miles. Clean title.");
    const result = calculateOwnership(vehicle, { ...researchFallback(vehicle), estimatedMpg: null }, defaultProfile);
    expect(result.fuelMonthly).toBeNull();
    expect(result.totalMonthly).toBeNull();
  });
});

describe("hard requirements", () => {
  it("flags verified failures but not unknown fields", () => {
    const vehicle = extractFallback("2017 Ford F-150 truck $24,000 with 145,000 miles. Salvage title and accident damage.");
    const failures = checkRequirements(vehicle, defaultProfile);
    expect(failures).toEqual(expect.arrayContaining([
      expect.stringContaining("Price"), expect.stringContaining("Mileage"), expect.stringContaining("Body style"), expect.stringContaining("damage"), expect.stringContaining("Title"),
    ]));
  });
});

describe("missing facts", () => {
  it("keeps unknown values explicit", () => {
    const vehicle = extractFallback("Nice family vehicle for sale. Please contact me for the details and price.");
    expect(findMissingFields(vehicle)).toEqual(expect.arrayContaining(["price", "mileage", "MPG", "title status"]));
  });
});
