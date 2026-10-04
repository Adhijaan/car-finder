"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CarFront, ExternalLink, Trash2 } from "lucide-react";
import { Badge, Button, Card, Empty } from "@/components/ui";
import { profileIsStale, useCarfinder } from "@/lib/store";
import { money, number, score } from "@/lib/utils";

export default function RankingsPage() {
  const [hydrated, setHydrated] = useState(false);
  const profile = useCarfinder((state) => state.profile);
  const vehicles = useCarfinder((state) => state.vehicles);
  const evaluations = useCarfinder((state) => state.evaluations);
  const remove = useCarfinder((state) => state.removeResult);
  useEffect(() => setHydrated(true), []);
  const rows = useMemo(() => evaluations.map((evaluation) => ({ evaluation, vehicle: vehicles.find((item) => item.id === evaluation.vehicleId) })).filter((row) => row.vehicle).sort((a, b) => b.evaluation.score - a.evaluation.score), [evaluations, vehicles]);
  if (!hydrated) return null;
  return <>
    <div className="page-header"><div><div className="eyebrow">Saved locally</div><h1>Your shortlist</h1><p>Compare evaluated cars under one buyer profile. Scores created before a preference change are marked stale.</p></div>{rows.length > 0 && <Badge tone="neutral">{rows.length} {rows.length === 1 ? "car" : "cars"}</Badge>}</div>
    {rows.length === 0 ? <Empty icon={<CarFront />} title="No cars evaluated yet" copy="Paste your first listing to build an evidence-backed shortlist." action={<Link className="button button-primary" href="/evaluate">Evaluate a listing</Link>} /> : <div className="rankings">{rows.map(({ evaluation, vehicle }, index) => {
      if (!vehicle) return null;
      const stale = profileIsStale(profile, evaluation);
      const title = [vehicle.year.value, vehicle.make.value, vehicle.model.value, vehicle.trim.value].filter(Boolean).join(" ") || "Untitled vehicle";
      return <Card className={stale ? "stale" : ""} key={vehicle.id}>
        <div className="ranking-card">
          <div className="rank-number">#{index + 1}</div>
          <div className="rank-title"><h2>{title}</h2><p>{evaluation.verdict} · {evaluation.confidence} confidence {stale && "· Preferences changed"}</p></div>
          <div className="rank-metric"><strong>{money(evaluation.ownership.purchasePrice)}</strong><small>Price</small></div>
          <div className="rank-metric"><strong>{number(typeof vehicle.mileage.value === "number" ? vehicle.mileage.value : null)}</strong><small>Miles</small></div>
          <div className="rank-metric"><strong>{money(evaluation.ownership.totalMonthly)}</strong><small>Est. monthly</small></div>
          <div className="rank-score">{score(evaluation.score)}</div>
          <Button variant="ghost" aria-label={`Remove ${title}`} onClick={() => remove(vehicle.id)}><Trash2 size={16} /></Button>
        </div>
        <details style={{ marginTop: 16 }}><summary style={{ cursor: "pointer", fontSize: 13, fontWeight: 750, color: "var(--green)" }}>View evaluation details</summary><div className="section-grid" style={{ marginTop: 18, marginBottom: 0 }}><div><h3>Top risks</h3><ul className="list-clean">{evaluation.risks.map((item) => <li key={item}>{item}</li>)}</ul></div><div><h3>Next action</h3><p className="card-subtitle">{evaluation.nextAction}</p>{vehicle.sourceUrl && <a className="source-link" href={vehicle.sourceUrl} target="_blank" rel="noreferrer">Open original listing <ExternalLink size={12} style={{ display: "inline" }} /></a>}</div></div></details>
      </Card>;
    })}</div>}
  </>;
}
