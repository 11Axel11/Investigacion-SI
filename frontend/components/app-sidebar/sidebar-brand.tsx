import Link from "next/link";
import { MapPinned } from "lucide-react";

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

export function SidebarBrand() {
  const { setOpenMobile, isMobile } = useSidebar();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          size="lg"
          tooltip="Observatorio CR"
          className="group-data-[collapsible=icon]:p-0!"
        >
          <Link
            href="/"
            onClick={() => {
              if (isMobile) setOpenMobile(false);
            }}
          >
            <div className="flex aspect-square size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <MapPinned className="size-4" />
            </div>
            <div className="grid flex-1 text-left leading-tight">
              <span className="truncate text-sm font-semibold">Observatorio CR</span>
              <span className="truncate text-xs text-muted-foreground">
                Territorial y electoral
              </span>
            </div>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
