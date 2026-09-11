import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";

import { NavMain } from "./app-sidebar/nav-main";
import { SidebarBrand } from "./app-sidebar/sidebar-brand";

export function AppSidebar() {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarBrand />
      </SidebarHeader>
      <SidebarContent className="gap-0">
        <NavMain />
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
