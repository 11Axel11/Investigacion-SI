"use client";

import Link from "next/link";
import { MapPinned } from "lucide-react";

import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";

function AppHeader() {
  const { isMobile } = useSidebar();

  return (
    <header className="sticky top-0 z-50 flex h-15 shrink-0 items-center justify-between border-b bg-background px-4">
      {!isMobile && <SidebarTrigger />}
      {isMobile && (
        <Link href="/" className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <MapPinned className="size-4" />
          </span>
          <span className="truncate text-sm font-semibold">Observatorio CR</span>
        </Link>
      )}
      {isMobile && <SidebarTrigger />}
    </header>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex flex-col overflow-auto">
        <AppHeader />
        <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
