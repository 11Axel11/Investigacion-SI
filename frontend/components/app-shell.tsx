"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { AppSidebar, Brand } from "@/components/app-sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

function AppHeader() {
  return (
    <header className="sticky top-0 z-30 flex h-15 shrink-0 items-center justify-between bg-background px-4">
      <SidebarTrigger className="max-md:hidden" />

      <Link href="/" className="md:hidden">
        <Brand className="flex items-center gap-2" />
      </Link>

      <div className="size-9 md:hidden" aria-hidden />
    </header>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const fullBleed = pathname === "/cobertura";

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className={cn("flex flex-col", fullBleed && "h-svh overflow-hidden")}>
        {!fullBleed && <AppHeader />}
        <main
          className={cn(
            "flex-1",
            fullBleed
              ? "min-h-0 p-0"
              : "px-4 pt-4 pb-[calc(var(--nav-reserve)+4.5rem)] md:px-6 md:pt-6 md:pb-8",
          )}
        >
          {fullBleed ? children : <div className="mx-auto w-full max-w-3xl">{children}</div>}
        </main>
      </SidebarInset>
      <MobileNav />
    </SidebarProvider>
  );
}
