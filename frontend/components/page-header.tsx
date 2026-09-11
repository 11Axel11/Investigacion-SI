import Link from "next/link";
import { Home } from "lucide-react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export function PageHeader({
  crumbs,
  title,
  description,
}: {
  crumbs: { href?: string; label: string }[];
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            {crumbs.length === 0 ? (
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
          {crumbs.map((crumb) => (
            <span key={crumb.label} className="contents">
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {crumb.href ? (
                  <BreadcrumbLink asChild>
                    <Link href={crumb.href}>{crumb.label}</Link>
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
            </span>
          ))}
        </BreadcrumbList>
      </Breadcrumb>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="mt-0.5 max-w-2xl text-sm text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  );
}
