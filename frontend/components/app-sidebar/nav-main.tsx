"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

import { navGroups, type NavItem } from "./navigation";

function isItemActive(item: NavItem, pathname: string | null): boolean {
  if (!pathname) return false;
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function NavMain() {
  const pathname = usePathname();
  const { setOpenMobile, isMobile } = useSidebar();

  return (
    <>
      {navGroups.map((group) => (
        <Collapsible
          key={group.label}
          asChild
          defaultOpen={group.defaultOpen ?? true}
          className="group/collapsible"
        >
          <SidebarGroup className="py-1">
            <SidebarGroupLabel
              asChild
              className="group/label h-6 cursor-pointer hover:text-sidebar-foreground"
            >
              <CollapsibleTrigger>
                {group.label}
                <ChevronRight className="ml-auto size-3.5 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
              <SidebarGroupContent>
                <SidebarMenu className="gap-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          asChild
                          isActive={isItemActive(item, pathname)}
                          tooltip={item.label}
                        >
                          <Link
                            href={item.href}
                            onClick={() => {
                              if (isMobile) setOpenMobile(false);
                            }}
                          >
                            <Icon className="size-4" />
                            <span>{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>
      ))}
    </>
  );
}
