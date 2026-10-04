"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { defaultProfile, type BuyerProfile, type VehicleEvaluation, type VehicleListing } from "@/lib/schemas";

type CarfinderState = {
  profile: BuyerProfile;
  vehicles: VehicleListing[];
  evaluations: VehicleEvaluation[];
  setProfile: (profile: BuyerProfile) => void;
  saveResult: (vehicle: VehicleListing, evaluation: VehicleEvaluation) => void;
  removeResult: (vehicleId: string) => void;
  clearAll: () => void;
};

export const useCarfinder = create<CarfinderState>()(persist((set) => ({
  profile: defaultProfile,
  vehicles: [],
  evaluations: [],
  setProfile: (profile) => set({ profile: { ...profile, updatedAt: new Date().toISOString() } }),
  saveResult: (vehicle, evaluation) => set((state) => ({
    vehicles: [vehicle, ...state.vehicles.filter((item) => item.id !== vehicle.id)],
    evaluations: [evaluation, ...state.evaluations.filter((item) => item.vehicleId !== vehicle.id)],
  })),
  removeResult: (vehicleId) => set((state) => ({
    vehicles: state.vehicles.filter((item) => item.id !== vehicleId),
    evaluations: state.evaluations.filter((item) => item.vehicleId !== vehicleId),
  })),
  clearAll: () => set({ profile: defaultProfile, vehicles: [], evaluations: [] }),
}), { name: "carfinder-v1", version: 1 }));

export function profileIsStale(profile: BuyerProfile, evaluation: VehicleEvaluation) {
  return profile.updatedAt !== evaluation.profileSnapshot.updatedAt;
}
