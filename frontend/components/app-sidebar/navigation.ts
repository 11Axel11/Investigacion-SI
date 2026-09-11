import { Home, Landmark, Map, ShieldCheck, type LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
  defaultOpen?: boolean;
};

export const navGroups: NavGroup[] = [
  {
    label: "Observatorio",
    items: [
      { href: "/", label: "Inicio", icon: Home, exact: true },
      { href: "/mapa", label: "Mapa OSM", icon: Map },
      { href: "/oij", label: "Datos OIJ", icon: ShieldCheck },
      { href: "/electoral", label: "Datos TSE", icon: Landmark },
      { href: "/cobertura", label: "Cobertura", icon: ShieldCheck },
    ],
  },
];

