"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Check, Save } from "lucide-react";
import { buyerProfileSchema, type BuyerProfile, type Priority } from "@/lib/schemas";
import { useCarfinder } from "@/lib/store";
import { Button, Card, Field } from "@/components/ui";

const bodyStyles = ["Sedan", "SUV", "Hatchback", "Wagon", "Minivan", "Truck", "Coupe"];
const uses = ["Daily driving", "Family", "Road trips", "Commuting", "Cargo", "Towing", "Winter driving"];
const factors: { key: keyof BuyerProfile["priorities"]; label: string; copy: string }[] = [
  { key: "reliability", label: "Reliability", copy: "Model and powertrain track record" },
  { key: "fuelEconomy", label: "Fuel economy", copy: "Gas use based on annual mileage" },
  { key: "value", label: "Purchase value", copy: "Price relative to your budget" },
  { key: "condition", label: "Condition", copy: "Mileage, damage, and seller claims" },
  { key: "space", label: "Practical fit", copy: "Seats, body style, and intended use" },
  { key: "resale", label: "Resale value", copy: "Expected value after ownership" },
];

function nullableNumber(value: string) {
  return value === "" ? null : Number(value);
}

export default function PreferencesPage() {
  const profile = useCarfinder((state) => state.profile);
  const setProfile = useCarfinder((state) => state.setProfile);
  const [saved, setSaved] = useState(false);
  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<BuyerProfile>({ resolver: zodResolver(buyerProfileSchema), defaultValues: profile });
  useEffect(() => reset(profile), [profile, reset]);
  const selectedBodies = watch("bodyStyles") || [];
  const selectedUses = watch("uses") || [];

  const toggle = (field: "bodyStyles" | "uses", value: string, selected: string[]) => {
    setValue(field, selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value], { shouldDirty: true });
  };
  const submit = (values: BuyerProfile) => {
    setProfile(values);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  };

  return <>
    <div className="page-header"><div><div className="eyebrow">Buyer profile</div><h1>What matters to you?</h1><p>Set your dealbreakers, priorities, and ownership assumptions. Every car is evaluated against this exact profile.</p></div></div>
    <form onSubmit={handleSubmit(submit)}>
      <div className="section-grid">
        <Card>
          <h2>Hard requirements</h2><p className="card-subtitle">Verified failures cap a vehicle at 4/10. Unknown facts become seller questions, not automatic failures.</p>
          <div className="form-grid" style={{ marginTop: 20 }}>
            <Field label="Profile name"><input {...register("name")} />{errors.name && <span className="error">{errors.name.message}</span>}</Field>
            <Field label="Maximum price"><input type="number" inputMode="numeric" {...register("maxPrice", { setValueAs: nullableNumber })} /></Field>
            <Field label="Maximum mileage"><input type="number" inputMode="numeric" {...register("maxMileage", { setValueAs: nullableNumber })} /></Field>
            <Field label="Minimum seats"><input type="number" min="2" max="15" {...register("minimumSeats", { setValueAs: nullableNumber })} /></Field>
            <div className="span-2"><span className="field-label">Acceptable body styles</span><div className="checkbox-row" style={{ marginTop: 9 }}>{bodyStyles.map((item) => <label className="check-pill" key={item}><input type="checkbox" checked={selectedBodies.includes(item)} onChange={() => toggle("bodyStyles", item, selectedBodies)} /><span>{item}</span></label>)}</div></div>
            <label className="toggle-line span-2"><input type="checkbox" {...register("rejectDamage")} /><span><strong>Reject reported damage</strong><br /><span className="field-hint">Treat disclosed accidents or body damage as a hard failure.</span></span></label>
            <label className="toggle-line span-2"><input type="checkbox" {...register("rejectBrandedTitle")} /><span><strong>Reject branded titles</strong><br /><span className="field-hint">Reject salvage, rebuilt, flood, or otherwise branded titles.</span></span></label>
          </div>
        </Card>
        <Card>
          <h2>Priority levels</h2><p className="card-subtitle">Tell the evaluator which tradeoffs deserve the most influence.</p>
          <div style={{ marginTop: 8 }}>{factors.map((factor) => <div className="factor" key={factor.key}><div className="factor-head"><div><div>{factor.label}</div><p>{factor.copy}</p></div><select style={{ width: 116 }} {...register(`priorities.${factor.key}`)}>{(["low", "medium", "high"] as Priority[]).map((value) => <option key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</option>)}</select></div></div>)}</div>
        </Card>
      </div>
      <div className="section-grid">
        <Card>
          <h2>Ownership assumptions</h2><p className="card-subtitle">Used to estimate depreciation and fuel cost per month.</p>
          <div className="form-grid" style={{ marginTop: 20 }}>
            <Field label="Years you plan to keep it"><input type="number" min="1" max="15" {...register("ownershipYears", { valueAsNumber: true })} /></Field>
            <Field label="Miles driven per year"><input type="number" min="0" {...register("annualMiles", { valueAsNumber: true })} /></Field>
            <Field label="Gas price per gallon"><input type="number" min="0" step="0.01" {...register("gasPrice", { valueAsNumber: true })} /></Field>
          </div>
          <div className="notice">The monthly estimate excludes financing, insurance, taxes, fees, maintenance, repairs, and tires.</div>
        </Card>
        <Card>
          <h2>How you will use it</h2><p className="card-subtitle">This helps distinguish a good car from a good car for you.</p>
          <div className="checkbox-row" style={{ margin: "18px 0" }}>{uses.map((item) => <label className="check-pill" key={item}><input type="checkbox" checked={selectedUses.includes(item)} onChange={() => toggle("uses", item, selectedUses)} /><span>{item}</span></label>)}</div>
          <Field label="Anything else?" hint="Examples: easy entry, room for a stroller, avoids premium fuel."><textarea {...register("notes")} /></Field>
        </Card>
      </div>
      <div className="form-actions">{saved && <span className="save-note"><Check size={15} style={{ display: "inline", verticalAlign: -3 }} /> Saved locally</span>}<Button type="submit"><Save size={16} /> Save preferences</Button></div>
    </form>
  </>;
}
