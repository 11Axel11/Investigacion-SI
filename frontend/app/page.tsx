import Link from "next/link";
import { ArrowRight, Landmark, Map, ShieldCheck } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const modules = [
  { href: "/oij", icon: ShieldCheck, title: "Estadísticas OIJ", action: "Explorar delitos" },
  { href: "/mapa", icon: Map, title: "Mapa", action: "Abrir mapa" },
  { href: "/electoral", icon: Landmark, title: "Padrón", action: "Ver padrón" },
];

export default function HomePage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <PageHeader crumbs={[]} title="Observatorio" />

      <div className="grid gap-4 md:grid-cols-2">
        {modules.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.href}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{item.title}</CardTitle>
                <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-4" />
                </span>
              </CardHeader>
              <CardFooter>
                <Button asChild className="w-full">
                  <Link href={item.href}>
                    {item.action}
                    <ArrowRight />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

