import {
  researchSchema,
  type BuyerProfile,
  type VehicleListing,
  type VehicleResearch,
} from "@/lib/schemas";
import { calculateOwnership, checkRequirements, findMissingFields, numeric, text } from "@/lib/evaluation";

const sourced = (value: string | number | boolean | null, confidence = 0.65) => ({
  value,
  source: value == null ? "unknown" as const : "listing" as const,
  confidence: value == null ? 0 : confidence,
});

function match(raw: string, pattern: RegExp): string | null {
  return raw.match(pattern)?.[1]?.trim() || null;
}

export function extractFallback(rawText: string, sourceUrl = ""): VehicleListing {
  const now = new Date().toISOString();
  const year = match(rawText, /\b((?:19|20)\d{2})\b/);
  const price = match(rawText, /\$\s*([\d,]{3,})/);
  const mileage = match(rawText, /([\d,]{2,})\s*(?:miles|mi\b)/i);
  const mpg = match(rawText, /([\d.]+)\s*mpg/i);
  const vin = match(rawText, /\bVIN[:\s#-]*([A-HJ-NPR-Z0-9]{17})\b/i);
  const title = match(rawText, /\b(clean|salvage|rebuilt|branded|flood)\s+title\b/i);
  const knownMakes = "Toyota|Honda|Ford|Chevrolet|Chevy|Subaru|Mazda|Hyundai|Kia|Nissan|Volkswagen|VW|Lexus|Acura|BMW|Mercedes-Benz|Audi|Volvo|Jeep|Ram|GMC|Buick|Chrysler|Dodge|Tesla";
  const vehicleName = rawText.match(new RegExp(`\\b((?:19|20)\\d{2})\\s+(${knownMakes})\\s+([A-Za-z0-9 -]{2,30})`, "i"));
  const damageText = /no (?:reported )?(?:accidents?|damage)/i.test(rawText)
    ? "No reported damage"
    : /accident|damage|dent|collision/i.test(rawText) ? "Possible damage mentioned" : null;
  return {
    id: crypto.randomUUID(), sourceUrl, rawText,
    year: sourced(year ? Number(year) : null, 0.9),
    make: sourced(vehicleName?.[2] || null, vehicleName ? 0.85 : 0),
    model: sourced(vehicleName?.[3]?.split(/\n|\||,| - /)[0]?.trim() || null, vehicleName ? 0.7 : 0),
    trim: sourced(null), price: sourced(price ? Number(price.replaceAll(",", "")) : null, 0.9),
    mileage: sourced(mileage ? Number(mileage.replaceAll(",", "")) : null, 0.85),
    engine: sourced(match(rawText, /\b(\d\.\dL[^,\n]*|V[468][^,\n]*|(?:four|six|eight)[ -]cylinder[^,\n]*)/i), 0.6),
    drivetrain: sourced(match(rawText, /\b(AWD|4WD|FWD|RWD|all-wheel drive|four-wheel drive)\b/i), 0.75),
    bodyStyle: sourced(match(rawText, /\b(SUV|sedan|hatchback|wagon|minivan|van|coupe|convertible|truck|pickup)\b/i), 0.7),
    seats: sourced(null), mpg: sourced(mpg ? Number(mpg) : null, 0.8), vin: sourced(vin, 0.95),
    damage: sourced(damageText, damageText ? 0.65 : 0), titleStatus: sourced(title ? `${title} title` : null, title ? 0.8 : 0),
    location: sourced(null), sellerClaims: rawText.split(/[.!\n]/).map((line) => line.trim()).filter((line) => line.length > 15).slice(0, 5),
    createdAt: now, updatedAt: now,
  };
}

export function researchFallback(vehicle: VehicleListing): VehicleResearch {
  const price = numeric(vehicle.price);
  const mileage = numeric(vehicle.mileage) || 0;
  const year = numeric(vehicle.year) || new Date().getFullYear() - 8;
  const ageAtSale = Math.max(1, new Date().getFullYear() - year);
  const retained = Math.max(0.25, 0.72 - ageAtSale * 0.018 - mileage / 1000000);
  return researchSchema.parse({
    reliabilitySummary: "Detailed outside research is temporarily unavailable. This recommendation uses the reviewed listing and should be confirmed with service records and an independent inspection.",
    commonIssues: ["Service history is unknown", "A pre-purchase inspection is still required"],
    strengths: [price != null ? "Purchase price is available for comparison" : "Listing can be completed manually"],
    estimatedMpg: numeric(vehicle.mpg),
    estimatedResaleValue: price == null ? null : Math.round(price * retained / 100) * 100,
    resaleRationale: "Demo estimate based on vehicle age and mileage; edit this before relying on the ownership estimate.",
    evidence: [], generatedBy: "demo", researchedAt: new Date().toISOString(),
  });
}

const weight = { low: 1, medium: 2, high: 3 } as const;

export function evaluateFallback(vehicle: VehicleListing, research: VehicleResearch, profile: BuyerProfile) {
  const failures = checkRequirements(vehicle, profile);
  const missing = findMissingFields(vehicle);
  const price = numeric(vehicle.price);
  const mileage = numeric(vehicle.mileage);
  const mpg = numeric(vehicle.mpg) ?? research.estimatedMpg;
  const maxPrice = profile.maxPrice || Math.max(price || 20000, 20000);
  const maxMileage = profile.maxMileage || 150000;
  const valueScore = price == null ? 5 : Math.max(1, Math.min(10, 11 - (price / maxPrice) * 6));
  const conditionScore = mileage == null ? 5 : Math.max(1, Math.min(10, 10 - (mileage / maxMileage) * 5));
  const economyScore = mpg == null ? 5 : Math.max(1, Math.min(10, mpg / 4));
  const reliabilityScore = Math.max(3, 7 - research.commonIssues.length * 0.45);
  const fitScore = failures.some((failure) => /seat|body style/.test(failure.toLowerCase())) ? 3 : 8;
  const resaleScore = research.estimatedResaleValue && price ? Math.max(1, Math.min(10, research.estimatedResaleValue / price * 12)) : 5;
  const values = [
    ["Reliability", reliabilityScore, profile.priorities.reliability],
    ["Fuel economy", economyScore, profile.priorities.fuelEconomy],
    ["Value", valueScore, profile.priorities.value],
    ["Condition", conditionScore, profile.priorities.condition],
    ["Practical fit", fitScore, profile.priorities.space],
    ["Resale", resaleScore, profile.priorities.resale],
  ] as const;
  const weighted = values.reduce((sum, [, score, priority]) => sum + score * weight[priority], 0) /
    values.reduce((sum, [, , priority]) => sum + weight[priority], 0);
  const score = Math.round((failures.length ? Math.min(4, weighted) : weighted) * 10) / 10;
  return {
    score,
    factors: values.map(([name, factorScore]) => ({ name, score: Math.round(factorScore * 10) / 10, reason: `Based on your preferences, the reviewed listing, and ${research.generatedBy === "demo" ? "the information currently available" : "cited research"}.` })),
    failures,
    missing,
  };
}

export function vehicleLabel(vehicle: VehicleListing) {
  return [text(vehicle.year), text(vehicle.make), text(vehicle.model), text(vehicle.trim)].filter(Boolean).join(" ") || "Untitled vehicle";
}

export function demoSummary(vehicle: VehicleListing, score: number, failures: string[]) {
  const label = vehicleLabel(vehicle);
  if (failures.length) return `${label} misses ${failures.length} of your hard requirements. Resolve those conflicts before considering the remaining strengths.`;
  if (score >= 8) return `${label} appears to be a strong fit for this buyer profile, subject to records and an independent inspection.`;
  if (score >= 6) return `${label} may fit, but the tradeoffs and missing information deserve a closer look.`;
  return `${label} looks like a weak fit for the current priorities and assumptions.`;
}
