"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { defaultProfile, type BuyerProfile, type VehicleEvaluation, type VehicleListing } from "@/lib/schemas";

export type ShortlistStatus = "considering" | "contacted" | "test-drive" | "rejected";
export type VehicleMeta = {
  favorite: boolean;
  archived: boolean;
  status: ShortlistStatus;
  notes: string;
  updatedAt: string;
};

type CarfinderState = {
  profile: BuyerProfile;
  vehicles: VehicleListing[];
  evaluations: VehicleEvaluation[];
  vehicleMeta: Record<string, VehicleMeta>;
  setProfile: (profile: BuyerProfile) => void;
  saveResult: (vehicle: VehicleListing, evaluation: VehicleEvaluation) => void;
  removeResult: (vehicleId: string) => void;
  updateVehicleMeta: (vehicleId: string, updates: Partial<Omit<VehicleMeta, "updatedAt">>) => void;
  clearAll: () => void;
};

export const useCarfinder = create<CarfinderState>()(persist((set) => ({
  profile: defaultProfile,
  vehicles: [],
  evaluations: [],
  vehicleMeta: {},
  setProfile: (profile) => set({ profile: { ...profile, updatedAt: new Date().toISOString() } }),
  saveResult: (vehicle, evaluation) => set((state) => ({
    vehicles: [vehicle, ...state.vehicles.filter((item) => item.id !== vehicle.id)],
    evaluations: [evaluation, ...state.evaluations.filter((item) => item.vehicleId !== vehicle.id)],
    vehicleMeta: {
      ...state.vehicleMeta,
      [vehicle.id]: state.vehicleMeta[vehicle.id] ?? { favorite: false, archived: false, status: "considering", notes: "", updatedAt: new Date().toISOString() },
    },
  })),
  removeResult: (vehicleId) => set((state) => ({
    vehicles: state.vehicles.filter((item) => item.id !== vehicleId),
    evaluations: state.evaluations.filter((item) => item.vehicleId !== vehicleId),
    vehicleMeta: Object.fromEntries(Object.entries(state.vehicleMeta).filter(([id]) => id !== vehicleId)),
  })),
  updateVehicleMeta: (vehicleId, updates) => set((state) => ({
    vehicleMeta: {
      ...state.vehicleMeta,
      [vehicleId]: {
        ...(state.vehicleMeta[vehicleId] ?? { favorite: false, archived: false, status: "considering", notes: "" }),
        ...updates,
        updatedAt: new Date().toISOString(),
      },
    },
  })),
  clearAll: () => set({ profile: defaultProfile, vehicles: [], evaluations: [], vehicleMeta: {} }),
}), {
  name: "carfinder-v1",
  version: 2,
  migrate: (persistedState) => {
    const previous = persistedState as Partial<CarfinderState>;
    return { ...previous, vehicleMeta: previous.vehicleMeta ?? {} } as CarfinderState;
  },
}));

export function profileIsStale(profile: BuyerProfile, evaluation: VehicleEvaluation) {
  return profile.updatedAt !== evaluation.profileSnapshot.updatedAt;
}
