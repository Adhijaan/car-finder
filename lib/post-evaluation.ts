import type { VehicleEvaluation } from "@/lib/schemas";

export type Readiness = {
  label: "Fails requirements" | "Needs seller answers" | "Needs inspection" | "Ready to decide";
  tone: "bad" | "warn" | "blue" | "good";
};

export function decisionReadiness(evaluation: VehicleEvaluation): Readiness {
  if (evaluation.hardRequirementFailures.length > 0) return { label: "Fails requirements", tone: "bad" };
  if (evaluation.missingFields.length > 0) return { label: "Needs seller answers", tone: "warn" };
  if (evaluation.risks.length > 0) return { label: "Needs inspection", tone: "blue" };
  return { label: "Ready to decide", tone: "good" };
}

export function factorScore(evaluation: VehicleEvaluation, name: string) {
  return evaluation.factors.find((factor) => factor.name.toLowerCase() === name.toLowerCase())?.score ?? null;
}

function readableField(field: string) {
  return field.replace(/([a-z])([A-Z])/g, "$1 $2").replaceAll("_", " ").toLowerCase();
}

export function buildSpecificNextAction({ failures, missing, risks, score }: { failures: string[]; missing: string[]; risks: string[]; score: number }) {
  if (failures.length > 0) return `Do not pursue this car unless the seller can provide evidence that resolves: ${failures[0]}`;
  if (missing.length > 0) {
    const fields = missing.slice(0, 2).map(readableField).join(" and ");
    return `Before arranging a viewing, ask the seller to confirm the ${fields} and provide supporting photos or documents.`;
  }
  if (risks.length > 0) {
    const primaryRisk = risks[0].replace(/[.]$/, "");
    return `Request records that address “${primaryRisk},” then have an independent mechanic inspect that area before making an offer.`;
  }
  if (score >= 8) return "Verify the VIN and service history, then book a pre-purchase inspection before negotiating the final price.";
  return "Ask the seller to substantiate the listing claims before deciding whether this car is worth an in-person inspection.";
}

const genericActions = new Set([
  "Request records and schedule an independent inspection.",
  "Resolve the missing information before spending time on an inspection.",
  "Skip unless the hard requirement can be resolved.",
]);

export function specificNextAction(evaluation: VehicleEvaluation) {
  if (evaluation.nextAction && !genericActions.has(evaluation.nextAction)) return evaluation.nextAction;
  return buildSpecificNextAction({ failures: evaluation.hardRequirementFailures, missing: evaluation.missingFields, risks: evaluation.risks, score: evaluation.score });
}
