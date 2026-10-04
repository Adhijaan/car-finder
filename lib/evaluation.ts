import type { BuyerProfile, OwnershipEstimate, VehicleListing, VehicleResearch } from "@/lib/schemas";

export function numeric(value: VehicleListing[keyof VehicleListing]): number | null {
  if (!value || typeof value !== "object" || !("value" in value)) return null;
  if (typeof value.value === "number" && Number.isFinite(value.value)) return value.value;
  if (typeof value.value === "string") {
    const parsed = Number(value.value.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function text(value: VehicleListing[keyof VehicleListing]): string {
  if (!value || typeof value !== "object" || !("value" in value) || value.value == null) return "";
  return String(value.value);
}

export function calculateOwnership(
  vehicle: VehicleListing,
  research: VehicleResearch,
  profile: BuyerProfile,
): OwnershipEstimate {
  const purchasePrice = numeric(vehicle.price);
  const resaleValue = research.estimatedResaleValue;
  const mpg = numeric(vehicle.mpg) ?? research.estimatedMpg;
  const months = profile.ownershipYears * 12;
  const depreciationMonthly = purchasePrice != null && resaleValue != null && months > 0
    ? Math.max(0, purchasePrice - resaleValue) / months
    : null;
  const fuelMonthly = mpg && mpg > 0
    ? (profile.annualMiles / mpg * profile.gasPrice) / 12
    : null;
  const totalMonthly = depreciationMonthly != null && fuelMonthly != null
    ? depreciationMonthly + fuelMonthly
    : null;
  return {
    purchasePrice,
    resaleValue,
    depreciationMonthly,
    fuelMonthly,
    totalMonthly,
    excludedCosts: ["Financing", "Insurance", "Taxes and fees", "Maintenance", "Repairs", "Tires"],
  };
}

export function checkRequirements(vehicle: VehicleListing, profile: BuyerProfile): string[] {
  const failures: string[] = [];
  const price = numeric(vehicle.price);
  const mileage = numeric(vehicle.mileage);
  const seats = numeric(vehicle.seats);
  const body = text(vehicle.bodyStyle).toLowerCase();
  const damage = text(vehicle.damage).toLowerCase();
  const title = text(vehicle.titleStatus).toLowerCase();
  if (profile.maxPrice && price != null && price > profile.maxPrice) failures.push(`Price exceeds $${profile.maxPrice.toLocaleString()} limit`);
  if (profile.maxMileage && mileage != null && mileage > profile.maxMileage) failures.push(`Mileage exceeds ${profile.maxMileage.toLocaleString()} limit`);
  if (profile.minimumSeats && seats != null && seats < profile.minimumSeats) failures.push(`Has fewer than ${profile.minimumSeats} seats`);
  if (profile.bodyStyles.length && body && !profile.bodyStyles.some((item) => body.includes(item.toLowerCase()))) failures.push("Body style is not acceptable");
  if (profile.rejectDamage && damage && !/none|no damage|clean/.test(damage)) failures.push("Reported damage is not acceptable");
  if (profile.rejectBrandedTitle && /(salvage|rebuilt|flood|branded)/.test(title)) failures.push("Title status is not acceptable");
  return failures;
}

export function findMissingFields(vehicle: VehicleListing): string[] {
  const labels: [keyof VehicleListing, string][] = [
    ["year", "year"], ["make", "make"], ["model", "model"], ["price", "price"],
    ["mileage", "mileage"], ["engine", "engine"], ["mpg", "MPG"],
    ["damage", "damage history"], ["titleStatus", "title status"],
  ];
  return labels.filter(([key]) => !text(vehicle[key])).map(([, label]) => label);
}
