import Link from "next/link";
import { ArrowRight, CheckCircle2, Search, SlidersHorizontal } from "lucide-react";

export default function HomePage() {
  return <section className="hero">
    <div className="hero-copy">
      <div className="eyebrow">Used-car decisions, made clearer</div>
      <h1>Find the car that fits <em>your life.</em></h1>
      <p>Paste a listing. Carfinder pulls out the facts, researches the risks, estimates monthly ownership cost, and rates the fit against what you actually care about.</p>
      <div className="hero-actions">
        <Link className="button button-primary" href="/evaluate">Evaluate a listing <ArrowRight size={17} /></Link>
        <Link className="button button-secondary" href="/preferences"><SlidersHorizontal size={17} /> Set preferences</Link>
      </div>
      <div className="pill-row" style={{ marginTop: 28 }}>
        <span className="badge badge-neutral"><CheckCircle2 size={12} /> No account needed</span>
        <span className="badge badge-neutral"><Search size={12} /> Evidence-backed</span>
      </div>
    </div>
    <div className="hero-card">
      <div className="eyebrow" style={{ color: "#a9d9b8" }}>Example evaluation</div>
      <div className="hero-score">8.4<span>/10</span></div>
      <h2>2019 Toyota RAV4</h2>
      <p>Strong match · High confidence</p>
      <div className="mini-grid">
        <div><small>Price</small><strong>$18,900</strong></div>
        <div><small>Mileage</small><strong>74k mi</strong></div>
        <div><small>Est. monthly</small><strong>$286</strong></div>
      </div>
      <div className="notice" style={{ background: "rgba(255,255,255,.1)", color: "rgba(255,255,255,.8)", marginBottom: 0 }}>Good reliability history and practical family fit. Verify the service records and inspect the transmission behavior.</div>
    </div>
  </section>;
}
