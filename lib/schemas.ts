import { z } from "zod";

export const prioritySchema = z.enum(["low", "medium", "high"]);
export type Priority = z.infer<typeof prioritySchema>;

export const buyerProfileSchema = z.object({
  name: z.string().trim().min(1),
  maxPrice: z.number().positive().nullable(),
  maxMileage: z.number().positive().nullable(),
  bodyStyles: z.array(z.string()),
  minimumSeats: z.number().int().min(2).max(15).nullable(),
  rejectDamage: z.boolean(),
  rejectBrandedTitle: z.boolean(),
  priorities: z.object({
    reliability: prioritySchema,
    fuelEconomy: prioritySchema,
    value: prioritySchema,
    condition: prioritySchema,
    space: prioritySchema,
    resale: prioritySchema,
  }),
  ownershipYears: z.number().min(1).max(15),
  annualMiles: z.number().min(0).max(100000),
  gasPrice: z.number().min(0).max(20),
  uses: z.array(z.string()),
  notes: z.string().max(1000),
  updatedAt: z.string(),
});
export type BuyerProfile = z.infer<typeof buyerProfileSchema>;

const sourceSchema = z.enum(["listing", "research", "user", "estimate", "unknown"]);
export const sourcedValueSchema = z.object({
  value: z.union([z.string(), z.number(), z.boolean()]).nullable(),
  source: sourceSchema,
  confidence: z.number().min(0).max(1),
});
export type SourcedValue = z.infer<typeof sourcedValueSchema>;

export const vehicleListingSchema = z.object({
  id: z.string(),
  sourceUrl: z.string().refine((value) => !value || /^https?:\/\//i.test(value), "Listing URL must use HTTP or HTTPS"),
  rawText: z.string(),
  year: sourcedValueSchema,
  make: sourcedValueSchema,
  model: sourcedValueSchema,
  trim: sourcedValueSchema,
  price: sourcedValueSchema,
  mileage: sourcedValueSchema,
  engine: sourcedValueSchema,
  drivetrain: sourcedValueSchema,
  bodyStyle: sourcedValueSchema,
  seats: sourcedValueSchema,
  mpg: sourcedValueSchema,
  vin: sourcedValueSchema,
  damage: sourcedValueSchema,
  titleStatus: sourcedValueSchema,
  location: sourcedValueSchema,
  sellerClaims: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type VehicleListing = z.infer<typeof vehicleListingSchema>;

export const evidenceSchema = z.object({
  title: z.string(),
  summary: z.string(),
  url: z.string().url().refine((value) => /^https?:\/\//i.test(value), "Source URL must use HTTP or HTTPS"),
  category: z.enum(["reliability", "engine", "recall", "economy", "resale", "other"]),
});
export type Evidence = z.infer<typeof evidenceSchema>;

export const researchSchema = z.object({
  reliabilitySummary: z.string(),
  commonIssues: z.array(z.string()),
  strengths: z.array(z.string()),
  estimatedMpg: z.number().positive().nullable(),
  estimatedResaleValue: z.number().nonnegative().nullable(),
  resaleRationale: z.string(),
  evidence: z.array(evidenceSchema),
  generatedBy: z.enum(["openai", "gemini", "demo"]),
  researchedAt: z.string(),
});
export type VehicleResearch = z.infer<typeof researchSchema>;

export const ownershipEstimateSchema = z.object({
  purchasePrice: z.number().nullable(),
  resaleValue: z.number().nullable(),
  depreciationMonthly: z.number().nullable(),
  fuelMonthly: z.number().nullable(),
  totalMonthly: z.number().nullable(),
  excludedCosts: z.array(z.string()),
});
export type OwnershipEstimate = z.infer<typeof ownershipEstimateSchema>;

export const factorRatingSchema = z.object({
  name: z.string(),
  score: z.number().min(1).max(10),
  reason: z.string(),
});

export const evaluationSchema = z.object({
  id: z.string(),
  vehicleId: z.string(),
  score: z.number().min(1).max(10),
  verdict: z.enum(["strong match", "possible match", "weak match", "fails requirements"]),
  confidence: z.enum(["high", "medium", "low"]),
  summary: z.string(),
  factors: z.array(factorRatingSchema),
  advantages: z.array(z.string()),
  risks: z.array(z.string()),
  dealbreakers: z.array(z.string()),
  sellerQuestions: z.array(z.string()),
  nextAction: z.string(),
  hardRequirementFailures: z.array(z.string()),
  missingFields: z.array(z.string()),
  ownership: ownershipEstimateSchema,
  research: researchSchema,
  profileSnapshot: buyerProfileSchema,
  engine: z.enum(["jev", "demo"]),
  evaluatedAt: z.string(),
});
export type VehicleEvaluation = z.infer<typeof evaluationSchema>;

export const defaultProfile: BuyerProfile = {
  name: "My car search",
  maxPrice: 20000,
  maxMileage: 120000,
  bodyStyles: ["SUV", "Sedan"],
  minimumSeats: 5,
  rejectDamage: true,
  rejectBrandedTitle: true,
  priorities: {
    reliability: "high",
    fuelEconomy: "medium",
    value: "high",
    condition: "high",
    space: "medium",
    resale: "medium",
  },
  ownershipYears: 5,
  annualMiles: 12000,
  gasPrice: 3.5,
  uses: ["Daily driving", "Family"],
  notes: "",
  updatedAt: new Date(0).toISOString(),
};
