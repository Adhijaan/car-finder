import { NextResponse } from "next/server";
import { z } from "zod";
import { buyerProfileSchema, evaluationSchema, researchSchema, vehicleListingSchema } from "@/lib/schemas";
import { calculateOwnership } from "@/lib/evaluation";
import { demoSummary, evaluateFallback, vehicleLabel } from "@/lib/server/fallbacks";

const requestSchema = z.object({ vehicle: vehicleListingSchema, profile: buyerProfileSchema, research: researchSchema });
const levels = ["Exceptionally poor fit", "Very poor fit", "Poor fit", "Weak fit", "Below-average fit", "Mixed or uncertain fit", "Reasonable fit", "Good fit", "Very good fit", "Excellent fit"];

export async function POST(request: Request) {
  try {
    const { vehicle, profile, research } = requestSchema.parse(await request.json());
    const fallback = evaluateFallback(vehicle, research, profile);
    let factors: Array<{ name: string; score: number; reason: string }> = fallback.factors;
    let score = fallback.score;
    let confidenceValue = Math.max(0.25, 0.9 - fallback.missing.length * 0.07);
    let engine: "jev" | "demo" = "demo";
    let recommendation = "";
    const jevKey = process.env.JEV_API_KEY;
    if (jevKey) {
      const questions: Record<string, unknown> = Object.fromEntries(["overall", "reliability", "fuel economy", "value", "condition", "practical fit", "resale"].map((name) => [name, {
        type: "score", instructions: `Rate the vehicle's ${name} for this specific buyer. Respect their hard requirements and priority levels.`, criteria: levels,
      }]));
      questions.recommendation = {
        type: "choice",
        instructions: "Classify this vehicle's overall fit for this specific buyer. A verified hard-requirement failure must be classified as fails requirements.",
        criteria: {
          "strong match": "Clearly fits the buyer's requirements and highest priorities, with manageable risks.",
          "possible match": "Could fit, but has meaningful tradeoffs, uncertainty, or missing information to resolve.",
          "weak match": "Conflicts with important preferences or has risks that outweigh its advantages.",
          "fails requirements": "Violates one or more verified hard requirements.",
        },
      };
      const response = await fetch("https://api.typesafe.ai/v1/systemone", {
        method: "POST", headers: { authorization: `Bearer ${jevKey}`, "content-type": "application/json" },
        body: JSON.stringify({ model: process.env.JEV_MODEL || "jev-latest", state: { vehicle, profile, research, ownership: calculateOwnership(vehicle, research, profile), hardRequirementFailures: fallback.failures, missingFields: fallback.missing }, questions }),
        signal: AbortSignal.timeout(45000),
      });
      if (!response.ok) throw new Error(`Jev request failed (${response.status})`);
      const payload = await response.json();
      score = Number(payload.answers.overall.score) + 1;
      confidenceValue = Number(payload.answers.overall.confidence);
      recommendation = String(payload.answers.recommendation?.choice || "");
      if (fallback.failures.length) score = Math.min(4, score);
      factors = Object.entries(payload.answers).filter(([name]) => name !== "overall" && name !== "recommendation").map(([name, answer]) => ({
        name: name.replace(/^./, (char) => char.toUpperCase()), score: Math.round(Math.min(10, Number((answer as { score: number }).score) + 1) * 10) / 10, reason: "Based on your preferences, the reviewed listing, and available research.",
      }));
      engine = "jev";
    }
    score = Math.round(Math.max(1, Math.min(10, score)) * 10) / 10;
    const allowedRecommendations = new Set(["strong match", "possible match", "weak match", "fails requirements"]);
    const verdict = fallback.failures.length
      ? "fails requirements"
      : allowedRecommendations.has(recommendation)
        ? recommendation
        : score >= 8 ? "strong match" : score >= 6 ? "possible match" : "weak match";
    const confidence = confidenceValue >= 0.75 && fallback.missing.length <= 2 ? "high" : confidenceValue >= 0.45 && fallback.missing.length <= 5 ? "medium" : "low";
    const ownership = calculateOwnership(vehicle, research, profile);
    const result = evaluationSchema.parse({
      id: crypto.randomUUID(), vehicleId: vehicle.id, score, verdict, confidence,
      summary: demoSummary(vehicle, score, fallback.failures), factors,
      advantages: research.strengths.slice(0, 4), risks: research.commonIssues.slice(0, 4),
      dealbreakers: fallback.failures, sellerQuestions: [
        "Can you provide the VIN and a current vehicle-history report?",
        "May I see maintenance and repair records?",
        ...fallback.missing.slice(0, 3).map((field) => `Can you confirm the ${field}?`),
        "Can an independent mechanic perform a pre-purchase inspection?",
      ],
      nextAction: fallback.failures.length ? "Skip unless the hard requirement can be resolved." : score >= 7 ? "Request records and schedule an independent inspection." : "Resolve the missing information before spending time on an inspection.",
      hardRequirementFailures: fallback.failures, missingFields: fallback.missing, ownership, research,
      profileSnapshot: profile, engine, evaluatedAt: new Date().toISOString(),
    });
    return NextResponse.json({ evaluation: result, mode: engine, vehicleLabel: vehicleLabel(vehicle) });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Some details need to be reviewed before we can make a recommendation." }, { status: 400 });
    console.error("Vehicle evaluation failed", error);
    return NextResponse.json({ error: "We couldn't finish the recommendation right now. Please wait a moment and try again." }, { status: 502 });
  }
}
