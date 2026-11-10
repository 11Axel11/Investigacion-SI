import { Home } from "lucide-react";
import Link from "next/link";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

/** Breadcrumb: Inicio › ...items. El último item es la página actual. */
export function PageBreadcrumb({
  items,
}: {
  items: { label: string; href?: string }[];
}) {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          {items.length === 0 ? (
            <BreadcrumbPage className="flex items-center gap-1.5">
              <Home className="size-3.5" />
              Inicio
            </BreadcrumbPage>
          ) : (
            <BreadcrumbLink asChild>
              <Link href="/" className="flex items-center gap-1.5">
                <Home className="size-3.5" />
                Inicio
              </Link>
            </BreadcrumbLink>
          )}
        </BreadcrumbItem>
        {items.map((item) => (
          <span key={item.label} className="contents">
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {item.href ? (
                <BreadcrumbLink asChild>
                  <Link href={item.href}>{item.label}</Link>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage>{item.label}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </span>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
