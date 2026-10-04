import Link from "next/link";
import { ArrowRight, CircleDollarSign, Fuel, ShieldCheck, SlidersHorizontal } from "lucide-react";

export default function HomePage() {
  return <>
    <section className="hero">
      <div className="hero-copy">
        <div className="trust-row">
          <span className="trust-icon"><ShieldCheck size={16} /></span>
          <span className="trust-icon"><Fuel size={16} /></span>
          <span className="trust-icon"><CircleDollarSign size={16} /></span>
          <span className="trust-copy">A clearer way to buy used</span>
        </div>
        <h1><span>Car Intelligence</span><span>Designed Around You</span></h1>
        <p>Turn any used-car listing into a clear recommendation shaped around your budget, priorities, and the way you actually drive.</p>
        <div className="hero-actions">
          <Link className="button button-secondary" href="/preferences"><SlidersHorizontal size={17} /> Set my priorities</Link>
          <Link className="button button-primary" href="/evaluate">Check a car <ArrowRight size={17} /></Link>
        </div>
      </div>
    </section>
  </>;
}
