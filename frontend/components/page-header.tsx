import { PageBreadcrumb } from "@/components/page-breadcrumb";

/** Cabecera estándar: breadcrumb + título + descripción, en un solo bloque compacto. */
export function PageHeader({
  crumb,
  title,
  description,
}: {
  crumb?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <PageBreadcrumb items={crumb ? [{ label: crumb }] : []} />
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
    </div>
  );
}
