"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { isActive, navGroups } from "@/components/app-sidebar/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";

export const APP_NAME = "Observatorio CR";

export function Brand({ className }: { className?: string }) {
  return (
    <span className={className}>
      <span className="grid flex-1 text-left leading-tight">
        <span className="truncate text-sm font-semibold">{APP_NAME}</span>
        <span className="truncate text-xs text-muted-foreground">
          Territorial y electoral
        </span>
      </span>
    </span>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5 group-data-[collapsible=icon]:justify-center">
          <Brand className="group-data-[collapsible=icon]:hidden" />
          <span className="hidden size-8 items-center justify-center rounded-lg bg-primary text-xs font-semibold text-primary-foreground group-data-[collapsible=icon]:flex">
            CR
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent className="gap-0">
        {navGroups.map((group) => (
          <SidebarGroup key={group.label} className="py-1">
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarMenu className="gap-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(pathname, item)}
                      tooltip={item.label}
                    >
                      <Link
                        href={item.href}
                        onClick={() => {
                          if (isMobile) setOpenMobile(false);
                        }}
                      >
                        <Icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <p className="px-2 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
          Proyecto académico OSINT
        </p>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
