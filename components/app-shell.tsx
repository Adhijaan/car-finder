"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CarFront, ClipboardCheck, ListOrdered, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/evaluate", label: "Evaluate", icon: ClipboardCheck },
  { href: "/rankings", label: "Rankings", icon: ListOrdered },
  { href: "/preferences", label: "Preferences", icon: SlidersHorizontal },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return <div className="app-shell">
    <header className="topbar">
      <Link className="brand" href="/"><span className="brand-mark"><CarFront size={23} /></span><span>Carfinder</span></Link>
      <nav>{links.map(({ href, label, icon: Icon }) => <Link key={href} className={cn("nav-link", path.startsWith(href) && "nav-link-active")} href={href}><Icon size={17} />{label}</Link>)}</nav>
    </header>
    <main>{children}</main>
    <footer>Decision support only · Always verify the title, history, and condition independently.</footer>
  </div>;
}
