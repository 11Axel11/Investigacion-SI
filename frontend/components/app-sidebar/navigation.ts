import {
  Home,
  Landmark,
  Map,
  Radar,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const navGroups: NavGroup[] = [
  {
    label: "Observatorio",
    items: [
      { href: "/", label: "Inicio", icon: Home, exact: true },
      { href: "/mapa", label: "Mapa OSM", icon: Map },
      { href: "/oij", label: "Datos OIJ", icon: ShieldCheck },
      { href: "/electoral", label: "Datos TSE", icon: Landmark },
      { href: "/cobertura", label: "Cobertura", icon: Radar },
    ],
  },
];

export const allNavItems = navGroups.flatMap((g) => g.items);

/** Barra inferior en móvil: lo de uso diario. El resto queda en el menú. */
const MOBILE_HREFS = ["/", "/mapa", "/oij", "/cobertura"];
export const mobileNavItems = MOBILE_HREFS.map(
  (href) => allNavItems.find((i) => i.href === href)!,
);

const under = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(`${href}/`);

export const isActive = (pathname: string | null, item: NavItem) =>
  !!pathname && (item.exact ? pathname === item.href : under(pathname, item.href));
