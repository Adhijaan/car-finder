"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardCheck, ListOrdered, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/evaluate", label: "Evaluate", icon: ClipboardCheck },
  { href: "/rankings", label: "Shortlist", icon: ListOrdered },
  { href: "/preferences", label: "Preferences", icon: SlidersHorizontal },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return <div className={cn("app-shell", path === "/" && "app-shell-home")}>
    <div className="app-background" aria-hidden="true">
      <video autoPlay muted loop playsInline>
        <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260809_012548_ef22562c-c0ae-4816-ad9d-f8922af4e6a7.mp4" type="video/mp4" />
      </video>
      <div className="app-background-shade" />
    </div>
    <header className="topbar">
      <Link className="brand" href="/" aria-label="Carfinder home"><span className="brand-mark"><img src="/assets/logo.webp" alt="" width="52" height="52" /></span><span>Carfinder</span></Link>
      <nav>{links.map(({ href, label, icon: Icon }) => <Link key={href} className={cn("nav-link", path.startsWith(href) && "nav-link-active")} href={href}><Icon size={17} />{label}</Link>)}</nav>
    </header>
    <main>{children}</main>
    <footer>Decision support only · Always verify the title, history, and condition independently.</footer>
  </div>;
}
