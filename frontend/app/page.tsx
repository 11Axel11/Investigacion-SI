import Link from "next/link";
import { Landmark, Map, Radar, ShieldCheck } from "lucide-react";

import { PageHeader } from "@/components/page-header";

const modules = [
  { href: "/mapa", icon: Map, label: "Mapa OSM" },
  { href: "/oij", icon: ShieldCheck, label: "Datos OIJ" },
  { href: "/electoral", icon: Landmark, label: "Datos TSE" },
  { href: "/cobertura", icon: Radar, label: "Cobertura" },
];

export default function HomePage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Observatorio"
        description="Fuentes OSINT de Costa Rica, en un solo panel."
      />

      <nav aria-label="Accesos rápidos">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {modules.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className="flex items-center gap-3 rounded-2xl bg-muted/40 p-4 text-sm font-medium transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-background">
                  <Icon className="size-4 text-primary" />
                </span>
                <span className="truncate">{label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
