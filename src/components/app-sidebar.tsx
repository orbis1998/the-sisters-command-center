import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  BookOpenText,
  Boxes,
  ShoppingCart,
  FileBarChart,
  Sparkles,
  Bell,
  FolderOpen,
  Activity,
  Settings,
  Lock,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useRole } from "@/lib/role-context";

const groups = [
  {
    label: "Vue d'ensemble",
    items: [
      { title: "Executive Dashboard", url: "/", icon: LayoutDashboard, ceoOnly: false },
    ],
  },
  {
    label: "Opérations",
    items: [
      { title: "Comptabilité", url: "/accounting", icon: BookOpenText, ceoOnly: false },
      { title: "Inventaire", url: "/inventory", icon: Boxes, ceoOnly: false },
      { title: "Documents", url: "/documents", icon: FolderOpen, ceoOnly: false },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { title: "Rapports", url: "/reports", icon: FileBarChart, ceoOnly: false },
      { title: "Analytics", url: "/analytics", icon: Sparkles, ceoOnly: true },
      { title: "Alertes", url: "/alerts", icon: Bell, ceoOnly: false },
    ],
  },
  {
    label: "Administration",
    items: [
      { title: "Journal d'activité", url: "/activity", icon: Activity, ceoOnly: false },
      { title: "Paramètres", url: "/settings", icon: Settings, ceoOnly: true },
    ],
  },
];

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { isCEO } = useRole();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-4 py-5">
        <Link to="/" className="flex items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md gold-gradient text-primary font-display text-sm font-bold">
            TS
          </div>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <div className="font-display text-sm font-semibold leading-tight text-sidebar-foreground">
              The Sisters
            </div>
            <div className="text-[11px] text-sidebar-foreground/60 tracking-wide">BUSINESS OS</div>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2">
        {groups.map((g) => (
          <SidebarGroup key={g.label}>
            <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-sidebar-foreground/50">
              {g.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {g.items.map((item) => {
                  const active = pathname === item.url;
                  const locked = item.ceoOnly && !isCEO;
                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild isActive={active} tooltip={item.title} disabled={locked}>
                        <Link to={locked ? "/" : item.url} className="flex items-center gap-2">
                          <item.icon className="h-4 w-4" />
                          <span className="flex-1 truncate">{item.title}</span>
                          {locked && <Lock className="h-3 w-3 opacity-50" />}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="p-3 group-data-[collapsible=icon]:hidden">
        <div className="rounded-md border border-sidebar-border bg-sidebar-accent/40 p-3">
          <div className="text-[11px] uppercase tracking-widest text-sidebar-foreground/60">
            Exercice fiscal
          </div>
          <div className="mt-1 font-display text-lg font-semibold text-sidebar-primary">2026</div>
          <div className="mt-1 text-[11px] text-sidebar-foreground/60">Q3 · Juillet</div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
