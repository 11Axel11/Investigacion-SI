"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { isActive, mobileNavItems } from "@/components/app-sidebar/navigation";
import { useSidebar } from "@/components/ui/sidebar";
import { useTextFocus } from "@/hooks/use-text-focus";
import { cn } from "@/lib/utils";

const BUTTON =
  "flex size-10 shrink-0 items-center justify-center rounded-full transition-colors min-[400px]:size-12";

/** Barra inferior liquid glass. Solo móvil; incluye el botón del sidebar. */
export function MobileNav() {
  const pathname = usePathname();
  const { openMobile, setOpenMobile } = useSidebar();
  const inBar = mobileNavItems.some((item) => isActive(pathname, item));
  const typing = useTextFocus();

  return (
    <nav
      aria-label="Navegación principal"
      aria-hidden={typing || undefined}
      inert={typing}
      className={cn(
        "pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-(--nav-bottom) transition-[translate,opacity] duration-300 ease-out motion-reduce:transition-none min-[400px]:px-6 md:hidden",
        typing && "translate-y-6 opacity-0",
      )}
    >
      <div className="pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto rounded-full bg-muted/80 p-2 backdrop-blur-2xl backdrop-saturate-200 min-[400px]:gap-1.5 [box-shadow:0_6px_20px_-8px_rgb(0_0_0/0.2)]">
        {mobileNavItems.map((item) => {
          const active = isActive(pathname, item);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className={cn(
                BUTTON,
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground/80 hover:bg-foreground/5",
              )}
            >
              <Icon className="size-5" />
            </Link>
          );
        })}

        <span aria-hidden className="mx-0.5 h-6 w-px bg-foreground/15" />

        <button
          type="button"
          aria-label="Abrir menú"
          aria-expanded={openMobile}
          onClick={() => setOpenMobile(!openMobile)}
          className={cn(
            BUTTON,
            openMobile
              ? "bg-primary text-primary-foreground"
              : !inBar
                ? "bg-foreground/10 text-foreground"
                : "text-foreground/80 hover:bg-foreground/5",
          )}
        >
          <Menu className="size-5" />
        </button>
      </div>
    </nav>
  );
}
