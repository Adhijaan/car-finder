"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Scale } from "lucide-react";
import { Badge, Card, Empty } from "@/components/ui";
import { decisionReadiness, factorScore, specificNextAction } from "@/lib/post-evaluation";
import { useCarfinder } from "@/lib/store";
import { money, number, score } from "@/lib/utils";

type ComparisonRow = { label: string; values: (number | null)[]; format: (value: number | null) => string; lowerIsBetter?: boolean };

export default function ComparePage() {
  const [hydrated, setHydrated] = useState(false);
  const [ids, setIds] = useState<string[]>([]);
  const vehicles = useCarfinder((state) => state.vehicles);
  const evaluations = useCarfinder((state) => state.evaluations);
  const vehicleMeta = useCarfinder((state) => state.vehicleMeta);

  useEffect(() => {
    setIds((new URLSearchParams(window.location.search).get("cars") || "").split(",").filter(Boolean).slice(0, 3));
    setHydrated(true);
  }, []);

  const cars = useMemo(() => ids.map((id) => {
    const vehicle = vehicles.find((item) => item.id === id);
    const evaluation = evaluations.find((item) => item.vehicleId === id);
    return vehicle && evaluation ? { vehicle, evaluation, meta: vehicleMeta?.[id] } : null;
  }).filter((item): item is NonNullable<typeof item> => Boolean(item)), [ids, vehicles, evaluations, vehicleMeta]);

  if (!hydrated) return null;
  if (cars.length < 2) return <><div className="page-header"><div><div className="eyebrow">Side-by-side</div><h1>Compare finalists</h1></div></div><Empty icon={<Scale />} title="Select at least two cars" copy="Choose two or three evaluated cars from your shortlist to compare them here." action={<Link className="button button-primary" href="/rankings">Go to shortlist</Link>} /></>;

  const rows: ComparisonRow[] = [
    { label: "Overall score", values: cars.map(({ evaluation }) => evaluation.score), format: (value) => value == null ? "—" : `${score(value)}/10` },
    { label: "Asking price", values: cars.map(({ evaluation }) => evaluation.ownership.purchasePrice), format: money, lowerIsBetter: true },
    { label: "Mileage", values: cars.map(({ vehicle }) => typeof vehicle.mileage.value === "number" ? vehicle.mileage.value : null), format: number, lowerIsBetter: true },
    { label: "Monthly estimate", values: cars.map(({ evaluation }) => evaluation.ownership.totalMonthly), format: money, lowerIsBetter: true },
    { label: "Reliability", values: cars.map(({ evaluation }) => factorScore(evaluation, "Reliability")), format: (value) => value == null ? "—" : `${score(value)}/10` },
    { label: "Fuel economy", values: cars.map(({ evaluation }) => factorScore(evaluation, "Fuel economy")), format: (value) => value == null ? "—" : `${score(value)}/10` },
    { label: "Value", values: cars.map(({ evaluation }) => factorScore(evaluation, "Value")), format: (value) => value == null ? "—" : `${score(value)}/10` },
    { label: "Condition", values: cars.map(({ evaluation }) => factorScore(evaluation, "Condition")), format: (value) => value == null ? "—" : `${score(value)}/10` },
    { label: "Practical fit", values: cars.map(({ evaluation }) => factorScore(evaluation, "Practical fit")), format: (value) => value == null ? "—" : `${score(value)}/10` },
    { label: "Resale", values: cars.map(({ evaluation }) => factorScore(evaluation, "Resale")), format: (value) => value == null ? "—" : `${score(value)}/10` },
  ];

  return <>
    <div className="page-header compare-header"><div><div className="eyebrow">Side-by-side</div><h1>Compare finalists</h1><p>Category leaders are highlighted. Use the tradeoffs and unresolved questions—not only the overall score—to make the final call.</p></div><Link className="button button-ghost" href="/rankings"><ArrowLeft size={16} /> Shortlist</Link></div>
    <Card className="comparison-card">
      <div className="comparison-grid comparison-cars" style={{ "--comparison-count": cars.length } as React.CSSProperties}>
        <div className="comparison-label">Vehicle</div>
        {cars.map(({ vehicle, evaluation }) => {
          const title = [vehicle.year.value, vehicle.make.value, vehicle.model.value, vehicle.trim.value].filter(Boolean).join(" ");
          const readiness = decisionReadiness(evaluation);
          return <div className="comparison-car" key={vehicle.id}><span className="comparison-score">{score(evaluation.score)}</span><h2>{title}</h2><p>{evaluation.verdict}</p><Badge tone={readiness.tone}>{readiness.label}</Badge></div>;
        })}
      </div>
      <div className="comparison-table">{rows.map((row) => {
        const known = row.values.filter((value): value is number => value != null && Number.isFinite(value));
        const best = known.length ? (row.lowerIsBetter ? Math.min(...known) : Math.max(...known)) : null;
        return <div className="comparison-grid comparison-row" style={{ "--comparison-count": cars.length } as React.CSSProperties} key={row.label}><div className="comparison-label">{row.label}</div>{row.values.map((value, index) => <div className={value != null && value === best ? "comparison-best" : ""} key={index}>{value != null && value === best && <Check size={14} />}<strong>{row.format(value)}</strong></div>)}</div>;
      })}</div>
    </Card>
    <div className="comparison-detail-grid" style={{ "--comparison-count": cars.length } as React.CSSProperties}>{cars.map(({ vehicle, evaluation, meta }) => <Card key={vehicle.id}><h2>{vehicle.make.value} {vehicle.model.value}</h2><div className="comparison-section"><h3>Bottom line</h3><p>{evaluation.summary}</p></div><div className="comparison-section"><h3>Top tradeoffs</h3><ul className="list-clean">{evaluation.risks.slice(0, 3).map((risk) => <li key={risk}>{risk}</li>)}</ul></div><div className="comparison-section"><h3>Questions still open</h3><ul className="list-clean">{evaluation.sellerQuestions.slice(0, 3).map((question) => <li key={question}>{question}</li>)}</ul></div>{meta?.notes && <div className="comparison-note"><strong>Your note</strong><p>{meta.notes}</p></div>}<div className="notice"><strong>Next action:</strong> {specificNextAction(evaluation)}</div></Card>)}</div>
  </>;
}
