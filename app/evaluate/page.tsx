"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, ExternalLink, FileSearch, Gauge, RotateCcw, Sparkles } from "lucide-react";
import { Button, Badge, Card, Field } from "@/components/ui";
import { useCarfinder } from "@/lib/store";
import type { SourcedValue, VehicleEvaluation, VehicleListing, VehicleResearch } from "@/lib/schemas";
import { money, number, score } from "@/lib/utils";
import { specificNextAction } from "@/lib/post-evaluation";

type Stage = "input" | "review" | "research" | "result";
const fields: { key: keyof VehicleListing; label: string; type?: "number" }[] = [
  { key: "year", label: "Year", type: "number" }, { key: "make", label: "Make" }, { key: "model", label: "Model" }, { key: "trim", label: "Trim" },
  { key: "price", label: "Price", type: "number" }, { key: "mileage", label: "Mileage", type: "number" }, { key: "engine", label: "Engine" }, { key: "drivetrain", label: "Drivetrain" },
  { key: "bodyStyle", label: "Body style" }, { key: "seats", label: "Seats", type: "number" }, { key: "mpg", label: "Combined MPG", type: "number" }, { key: "vin", label: "VIN" },
  { key: "damage", label: "Reported damage" }, { key: "titleStatus", label: "Title status" }, { key: "location", label: "Location" },
];

async function post<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "Request failed");
  return payload;
}

function Steps({ stage, available, onNavigate }: { stage: Stage; available: Set<Stage>; onNavigate: (stage: Stage) => void }) {
  const position = { input: 1, review: 2, research: 3, result: 4 }[stage];
  const stages: { stage: Stage; label: string }[] = [
    { stage: "input", label: "Listing" },
    { stage: "review", label: "Review" },
    { stage: "research", label: "Research" },
    { stage: "result", label: "Decision" },
  ];
  return <div className="steps" aria-label="Evaluation progress">{stages.map((item, index) => {
    const enabled = available.has(item.stage);
    return <div style={{ display: "contents" }} key={item.stage}>{index > 0 && <div className="step-line" />}<button
      type="button"
      className={`step ${position >= index + 1 ? "step-active" : ""} ${enabled ? "step-clickable" : ""}`}
      disabled={!enabled}
      aria-current={stage === item.stage ? "step" : undefined}
      onClick={() => onNavigate(item.stage)}
    ><span>{position > index + 1 ? "✓" : index + 1}</span>{item.label}</button></div>;
  })}</div>;
}

export default function EvaluatePage() {
  const profile = useCarfinder((state) => state.profile);
  const saveResult = useCarfinder((state) => state.saveResult);
  const [stage, setStage] = useState<Stage>("input");
  const [sourceUrl, setSourceUrl] = useState("");
  const [rawText, setRawText] = useState("");
  const [vehicle, setVehicle] = useState<VehicleListing | null>(null);
  const [research, setResearch] = useState<VehicleResearch | null>(null);
  const [evaluation, setEvaluation] = useState<VehicleEvaluation | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const availableStages = new Set<Stage>([
    "input",
    ...(vehicle ? ["review" as const] : []),
    ...(research ? ["research" as const] : []),
    ...(evaluation ? ["result" as const] : []),
  ]);

  const navigateStage = (nextStage: Stage) => {
    if (!availableStages.has(nextStage) || busy) return;
    setError("");
    setStage(nextStage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const extract = async () => {
    if (sourceUrl && !/^https?:\/\//i.test(sourceUrl)) {
      setError("Listing URL must start with http:// or https://");
      return;
    }
    setBusy(true); setError("");
    try {
      const payload = await post<{ vehicle: VehicleListing; mode: "gemini" | "demo" }>("/api/extract", { rawText, sourceUrl });
      setVehicle(payload.vehicle); setStage("review");
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to extract listing"); }
    finally { setBusy(false); }
  };
  const updateField = (key: keyof VehicleListing, value: string, numericField?: boolean) => {
    if (!vehicle) return;
    const next: SourcedValue = { value: value === "" ? null : numericField ? Number(value) : value, source: value === "" ? "unknown" : "user", confidence: value === "" ? 0 : 1 };
    setVehicle({ ...vehicle, [key]: next, updatedAt: new Date().toISOString() });
  };
  const runResearch = async () => {
    if (!vehicle) return;
    setStage("research"); setBusy(true); setError("");
    try {
      const payload = await post<{ research: VehicleResearch; mode: "openai" | "demo" }>("/api/research", { vehicle, profile });
      setResearch(payload.research);
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to research vehicle"); }
    finally { setBusy(false); }
  };
  const evaluate = async () => {
    if (!vehicle || !research) return;
    setBusy(true); setError("");
    try {
      const payload = await post<{ evaluation: VehicleEvaluation; mode: "jev" | "demo" }>("/api/evaluate", { vehicle, profile, research });
      setEvaluation(payload.evaluation); saveResult(vehicle, payload.evaluation); setStage("result");
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to evaluate vehicle"); }
    finally { setBusy(false); }
  };
  const reset = () => { setStage("input"); setSourceUrl(""); setRawText(""); setVehicle(null); setResearch(null); setEvaluation(null); setError(""); };

  return <>
    <div className="page-header"><div><div className="eyebrow">New evaluation</div><h1>{stage === "result" ? "Your car verdict" : "Turn a listing into a decision."}</h1><p>{stage === "input" ? "Paste the seller's listing details. You will review every extracted fact before it affects the score." : "Facts, evidence, assumptions, and buyer preferences stay visible throughout the decision."}</p></div></div>
    <Steps stage={stage} available={availableStages} onNavigate={navigateStage} />
    {error && <div className="error"><AlertTriangle size={16} style={{ display: "inline", verticalAlign: -3, marginRight: 7 }} />{error}</div>}

    {stage === "input" && <Card style={{ maxWidth: 850 }}>
      <h2>Paste a car listing</h2><p className="card-subtitle">Copy the title, price, description, and any visible specifications from Facebook Marketplace or another source.</p>
      <div className="form-grid" style={{ marginTop: 22 }}>
        <Field label="Listing URL" hint="Optional. Saved as the original source; Carfinder does not require automated scraping."><input type="url" placeholder="https://facebook.com/marketplace/item/..." value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} /></Field>
        <div />
        <div className="span-2"><Field label="Listing details" hint="Include at least 20 characters. Pasted text is treated as untrusted data, never as instructions."><textarea className="input-large" placeholder={'2019 Toyota RAV4 XLE\n$18,900 · 74,000 miles\nClean title, AWD...'} value={rawText} onChange={(event) => setRawText(event.target.value)} /></Field></div>
      </div>
      <div className="notice">We’ll pull out the important details for you. You can correct anything on the next screen before it affects the recommendation.</div>
      <div className="form-actions"><Button onClick={extract} disabled={busy || rawText.trim().length < 20}>{busy ? <span className="loading" /> : <Sparkles size={16} />} Extract listing</Button></div>
    </Card>}

    {stage === "review" && vehicle && <Card>
      <h2>Review extracted facts</h2><p className="card-subtitle">Correct mistakes and fill gaps. Your edits are marked as user-confirmed and take priority over extraction.</p>
      <div className="vehicle-fields" style={{ marginTop: 24 }}>{fields.map(({ key, label, type }) => {
        const sourced = vehicle[key] as SourcedValue;
        return <Field key={key} label={label}><input type={type || "text"} value={sourced?.value == null ? "" : String(sourced.value)} onChange={(event) => updateField(key, event.target.value, type === "number")} /><span className="source-row"><span>{sourced?.source || "unknown"}</span><span>{Math.round((sourced?.confidence || 0) * 100)}% confidence</span></span></Field>;
      })}</div>
      <div className="form-actions" style={{ marginTop: 22 }}><Button variant="ghost" onClick={() => setStage("input")}><ArrowLeft size={16} /> Back</Button><span style={{ flex: 1 }} /><Button onClick={runResearch}>Research this car <ArrowRight size={16} /></Button></div>
    </Card>}

    {stage === "research" && <>
      {busy && <Card><div className="empty" style={{ border: 0, padding: 80 }}><div className="empty-icon"><span className="loading" /></div><h2>Researching the exact vehicle</h2><p>Checking reliability, likely issues, fuel economy, and future resale assumptions.</p></div></Card>}
      {!busy && research && <div className="research-layout">
        <Card>
          <div><h2>Research review</h2><p className="card-subtitle">Evidence and estimates used to make your recommendation.</p></div>
          <h3 style={{ marginTop: 24 }}>Reliability outlook</h3><p style={{ color: "var(--muted)", lineHeight: 1.6 }}>{research.reliabilitySummary}</p>
          <div className="section-grid" style={{ marginTop: 20, marginBottom: 0 }}><div><h3>Likely strengths</h3><ul className="list-clean">{research.strengths.map((item) => <li key={item}><CheckCircle2 size={15} color="var(--green)" style={{ display: "inline", marginRight: 8, verticalAlign: -2 }} />{item}</li>)}</ul></div><div><h3>Risks to verify</h3><ul className="list-clean">{research.commonIssues.map((item) => <li key={item}><AlertTriangle size={15} color="var(--orange)" style={{ display: "inline", marginRight: 8, verticalAlign: -2 }} />{item}</li>)}</ul></div></div>
          {research.evidence.length > 0 && <><h3 style={{ marginTop: 24 }}>Sources</h3>{research.evidence.map((source, index) => <a className="source-link" key={`${source.url}-${index}`} target="_blank" rel="noreferrer" href={source.url}>{source.title} <ExternalLink size={12} style={{ display: "inline" }} /><small style={{ display: "block", color: "var(--muted)", marginTop: 3 }}>{source.summary}</small></a>)}</>}
        </Card>
        <div>
          <Card>
            <h2>Cost assumptions</h2><p className="card-subtitle">The evaluator uses these values. Change the resale estimate if your own research suggests a better figure.</p>
            <div className="form-grid" style={{ marginTop: 20 }}><Field label={`Resale after ${profile.ownershipYears} years`}><input type="number" value={research.estimatedResaleValue ?? ""} onChange={(event) => setResearch({ ...research, estimatedResaleValue: event.target.value ? Number(event.target.value) : null })} /></Field><Field label="Combined MPG"><input type="number" value={research.estimatedMpg ?? ""} onChange={(event) => setResearch({ ...research, estimatedMpg: event.target.value ? Number(event.target.value) : null })} /></Field></div>
            <div className="notice">{research.resaleRationale}</div>
            <div className="metric-grid"><div className="metric"><small>Annual miles</small><strong>{number(profile.annualMiles)}</strong></div><div className="metric"><small>Gas price</small><strong>{money(profile.gasPrice, 2)}</strong></div><div className="metric"><small>Ownership</small><strong>{profile.ownershipYears} yr</strong></div></div>
          </Card>
          <div className="form-actions" style={{ marginTop: 15 }}><Button variant="ghost" onClick={() => setStage("review")}><ArrowLeft size={16} /> Edit facts</Button><span style={{ flex: 1 }} /><Button onClick={evaluate} disabled={busy}><Gauge size={16} /> Get verdict</Button></div>
        </div>
      </div>}
    </>}

    {stage === "result" && evaluation && vehicle && <div className="result-layout">
      <div>
        <Card>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}><div><div className="classification-label">Overall recommendation</div><div className={`classification classification-${evaluation.verdict.replaceAll(" ", "-")}`}>{evaluation.verdict}</div><h2 style={{ fontSize: 30, marginTop: 18 }}>{[vehicle.year.value, vehicle.make.value, vehicle.model.value, vehicle.trim.value].filter(Boolean).join(" ")}</h2></div><Badge tone="neutral">{evaluation.confidence} confidence</Badge></div>
          <p style={{ color: "var(--muted)", fontSize: 16, lineHeight: 1.65 }}>{evaluation.summary}</p>
          {evaluation.hardRequirementFailures.length > 0 && <div className="notice notice-warn"><strong>Hard requirement failures</strong><ul className="list-clean warning-list">{evaluation.hardRequirementFailures.map((item) => <li key={item}>{item}</li>)}</ul></div>}
          <div className="metric-grid"><div className="metric"><small>Purchase price</small><strong>{money(evaluation.ownership.purchasePrice)}</strong></div><div className="metric"><small>Est. resale</small><strong>{money(evaluation.ownership.resaleValue)}</strong></div><div className="metric"><small>Simplified monthly</small><strong>{money(evaluation.ownership.totalMonthly)}</strong></div></div>
          <div className="section-grid" style={{ marginTop: 24, marginBottom: 0 }}><div><h3>What works</h3><ul className="list-clean">{evaluation.advantages.map((item) => <li key={item}>{item}</li>)}</ul></div><div><h3>Risks</h3><ul className="list-clean">{evaluation.risks.map((item) => <li key={item}>{item}</li>)}</ul></div></div>
        </Card>
        <Card style={{ marginTop: 20 }}><h2>Questions for the seller</h2><ul className="list-clean">{evaluation.sellerQuestions.map((item) => <li key={item}>{item}</li>)}</ul><div className="notice" style={{ marginBottom: 0 }}><strong>Next action:</strong> {specificNextAction(evaluation)}</div></Card>
      </div>
      <div>
        <Card><div className="score-ring" style={{ "--score-percent": `${evaluation.score * 10}%` } as React.CSSProperties}><strong>{score(evaluation.score)}<span>/10</span></strong></div>{evaluation.factors.map((factor) => <div className="factor" key={factor.name}><div className="factor-head"><span>{factor.name}</span><span>{score(factor.score)}/10</span></div><div className="meter"><span style={{ width: `${factor.score * 10}%` }} /></div><p>{factor.reason}</p></div>)}</Card>
        <div className="form-actions" style={{ marginTop: 15 }}><Button variant="ghost" onClick={reset}><RotateCcw size={16} /> Another car</Button><Link className="button button-primary" href="/rankings"><FileSearch size={16} /> View rankings</Link></div>
      </div>
    </div>}
  </>;
}
