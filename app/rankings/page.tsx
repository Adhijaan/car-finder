"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Archive, ArchiveRestore, CarFront, ExternalLink, Heart, Search, Scale, Trash2 } from "lucide-react";
import { Badge, Button, Card, Empty } from "@/components/ui";
import { decisionReadiness, specificNextAction } from "@/lib/post-evaluation";
import { profileIsStale, type ShortlistStatus, useCarfinder } from "@/lib/store";
import { money, number, score } from "@/lib/utils";

type SortOption = "score" | "newest" | "price" | "mileage" | "monthly";
type StatusFilter = "all" | "favorites" | ShortlistStatus;

const statusLabels: Record<ShortlistStatus, string> = { considering: "Considering", contacted: "Contacted", "test-drive": "Test drive", rejected: "Rejected" };

export default function RankingsPage() {
  const [hydrated, setHydrated] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("score");
  const [showArchived, setShowArchived] = useState(false);
  const [comparisonMode, setComparisonMode] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const profile = useCarfinder((state) => state.profile);
  const vehicles = useCarfinder((state) => state.vehicles);
  const evaluations = useCarfinder((state) => state.evaluations);
  const vehicleMeta = useCarfinder((state) => state.vehicleMeta);
  const updateMeta = useCarfinder((state) => state.updateVehicleMeta);
  const remove = useCarfinder((state) => state.removeResult);
  useEffect(() => setHydrated(true), []);

  const allRows = useMemo(() => evaluations.map((evaluation) => {
    const vehicle = vehicles.find((item) => item.id === evaluation.vehicleId);
    const meta = vehicleMeta?.[evaluation.vehicleId] ?? { favorite: false, archived: false, status: "considering" as const, notes: "", updatedAt: evaluation.evaluatedAt };
    return { evaluation, vehicle, meta };
  }).filter((row) => row.vehicle), [evaluations, vehicles, vehicleMeta]);

  const rows = useMemo(() => {
    const term = query.trim().toLowerCase();
    return allRows.filter(({ evaluation, vehicle, meta }) => {
      if (!vehicle || meta.archived !== showArchived) return false;
      const title = [vehicle.year.value, vehicle.make.value, vehicle.model.value, vehicle.trim.value].filter(Boolean).join(" ").toLowerCase();
      if (term && !title.includes(term) && !evaluation.verdict.includes(term)) return false;
      if (statusFilter === "favorites") return meta.favorite;
      return statusFilter === "all" || meta.status === statusFilter;
    }).sort((a, b) => {
      if (!a.vehicle || !b.vehicle) return 0;
      if (sortBy === "newest") return new Date(b.evaluation.evaluatedAt).getTime() - new Date(a.evaluation.evaluatedAt).getTime();
      if (sortBy === "price") return (Number(a.vehicle.price.value) || Infinity) - (Number(b.vehicle.price.value) || Infinity);
      if (sortBy === "mileage") return (Number(a.vehicle.mileage.value) || Infinity) - (Number(b.vehicle.mileage.value) || Infinity);
      if (sortBy === "monthly") return (a.evaluation.ownership.totalMonthly ?? Infinity) - (b.evaluation.ownership.totalMonthly ?? Infinity);
      return b.evaluation.score - a.evaluation.score;
    });
  }, [allRows, query, showArchived, sortBy, statusFilter]);

  const toggleSelected = (vehicleId: string) => setSelected((current) => current.includes(vehicleId) ? current.filter((id) => id !== vehicleId) : current.length < 3 ? [...current, vehicleId] : current);
  if (!hydrated) return null;

  return <>
    <div className="page-header"><div><div className="eyebrow">Decision workspace</div><h1>Your shortlist</h1><p>Organize promising options, keep track of next steps, and compare finalists using the same buyer profile.</p></div>{allRows.length > 0 && <Badge tone="neutral">{allRows.length} evaluated</Badge>}</div>
    {allRows.length === 0 ? <Empty icon={<CarFront />} title="No cars evaluated yet" copy="Paste your first listing to build an evidence-backed shortlist." action={<Link className="button button-primary" href="/evaluate">Evaluate a listing</Link>} /> : <>
      <Card className="shortlist-toolbar">
        <label className="search-control"><Search size={16} /><input aria-label="Search evaluated cars" placeholder="Search make, model, or verdict" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        <select aria-label="Filter shortlist" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}><option value="all">All active cars</option><option value="favorites">Favorites</option>{Object.entries(statusLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select>
        <select aria-label="Sort shortlist" value={sortBy} onChange={(event) => setSortBy(event.target.value as SortOption)}><option value="score">Highest score</option><option value="newest">Newest</option><option value="price">Lowest price</option><option value="mileage">Lowest mileage</option><option value="monthly">Lowest monthly cost</option></select>
        <div className="toolbar-actions"><Button variant="ghost" onClick={() => { setComparisonMode((value) => !value); setSelected([]); }}><Scale size={16} />{comparisonMode ? "Done" : "Compare"}</Button><Button variant="ghost" onClick={() => { setShowArchived((value) => !value); setSelected([]); }}>{showArchived ? <ArchiveRestore size={16} /> : <Archive size={16} />}{showArchived ? "Active cars" : "Archived"}</Button></div>
      </Card>
      <div className="shortlist-summary"><span>{rows.length} shown</span>{comparisonMode && <span>Select two or three cars to compare.</span>}</div>
      {rows.length === 0 ? <Empty icon={<Search />} title="No matching cars" copy="Try a different search, status, or archive filter." /> : <div className="rankings">{rows.map(({ evaluation, vehicle, meta }) => {
        if (!vehicle) return null;
        const stale = profileIsStale(profile, evaluation);
        const title = [vehicle.year.value, vehicle.make.value, vehicle.model.value, vehicle.trim.value].filter(Boolean).join(" ") || "Untitled vehicle";
        const readiness = decisionReadiness(evaluation);
        const isSelected = selected.includes(vehicle.id);
        return <Card className={`${stale ? "stale" : ""} ${isSelected ? "ranking-selected" : ""}`} key={vehicle.id}>
          <div className={`ranking-card ranking-card-expanded ${comparisonMode ? "comparison-mode" : ""}`}>
            {comparisonMode && <label className="compare-check"><input type="checkbox" checked={isSelected} disabled={!isSelected && selected.length >= 3} onChange={() => toggleSelected(vehicle.id)} /><span>{isSelected ? "Selected" : "Compare"}</span></label>}
            <div className="rank-title"><h2>{title}</h2><p>{evaluation.verdict} · {evaluation.confidence} confidence {stale && "· Preferences changed"}</p><div className="ranking-badges"><Badge tone={readiness.tone}>{readiness.label}</Badge><Badge tone="neutral">{statusLabels[meta.status]}</Badge></div></div>
            <div className="rank-metric metric-price"><strong>{money(evaluation.ownership.purchasePrice)}</strong><small>Price</small></div><div className="rank-metric metric-miles"><strong>{number(typeof vehicle.mileage.value === "number" ? vehicle.mileage.value : null)}</strong><small>Miles</small></div><div className="rank-metric metric-monthly"><strong>{money(evaluation.ownership.totalMonthly)}</strong><small>Est. monthly</small></div><div className="rank-score">{score(evaluation.score)}</div>
          </div>
          <details className="shortlist-details"><summary>View details and next steps</summary><div className="shortlist-controls"><label><span>Status</span><select value={meta.status} onChange={(event) => updateMeta(vehicle.id, { status: event.target.value as ShortlistStatus })}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="notes-control"><span>Personal notes</span><textarea rows={2} placeholder="Seller response, test drive notes, or what to verify…" value={meta.notes} onChange={(event) => updateMeta(vehicle.id, { notes: event.target.value })} /></label><div className="ranking-actions"><button className={`icon-action ${meta.favorite ? "is-favorite" : ""}`} aria-label={meta.favorite ? `Remove ${title} from favorites` : `Favorite ${title}`} onClick={() => updateMeta(vehicle.id, { favorite: !meta.favorite })}><Heart size={18} fill={meta.favorite ? "currentColor" : "none"} /></button>{vehicle.sourceUrl && <a className="button button-ghost" href={vehicle.sourceUrl} target="_blank" rel="noreferrer">Listing <ExternalLink size={14} /></a>}<Button variant="ghost" onClick={() => updateMeta(vehicle.id, { archived: !meta.archived })}>{meta.archived ? <ArchiveRestore size={15} /> : <Archive size={15} />}{meta.archived ? "Restore" : "Archive"}</Button><Button variant="ghost" aria-label={`Delete ${title}`} onClick={() => remove(vehicle.id)}><Trash2 size={15} /></Button></div></div><div className="section-grid shortlist-evaluation-detail"><div><h3>Top risks</h3><ul className="list-clean">{evaluation.risks.map((item) => <li key={item}>{item}</li>)}</ul></div><div><h3>Next action</h3><p className="card-subtitle">{specificNextAction(evaluation)}</p></div></div></details>
        </Card>;
      })}</div>}
      {comparisonMode && selected.length > 0 && <div className="compare-dock"><span><strong>{selected.length}</strong> selected</span><button onClick={() => setSelected([])}>Clear</button><Link className={`button button-primary ${selected.length < 2 ? "button-disabled" : ""}`} aria-disabled={selected.length < 2} tabIndex={selected.length < 2 ? -1 : 0} href={selected.length >= 2 ? `/compare?cars=${selected.join(",")}` : "#"}><Scale size={16} /> Compare cars</Link></div>}
    </>}
  </>;
}
