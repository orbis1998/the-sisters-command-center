import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Boxes,
  FileBarChart,
  Sparkles,
  Users,
  Activity,
  Settings,
  Truck,
  Receipt,
  ClipboardList,
  ShoppingCart,
  ArrowLeftRight,
  Store,
  CalendarRange,
  Warehouse,
  PackageMinus,
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
import { useEffect, useState } from "react";
import { loadOpenAccountingPeriod } from "@/lib/accounting-periods";

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { isCEO, isDepot } = useRole();
  const [periodLabel, setPeriodLabel] = useState("—");

  useEffect(() => {
    if (!isCEO) return;
    void loadOpenAccountingPeriod().then((period) => {
      setPeriodLabel(period?.label || "—");
    });
  }, [isCEO, pathname]);

  const ceoGroups = [
    {
      label: "Pilotage",
      items: [{ title: "Tableau de bord", url: "/", icon: LayoutDashboard }],
    },
    {
      label: "Stock & dépôt",
      items: [
        { title: "Stock global", url: "/inventory", icon: Boxes },
        { title: "Flux stock", url: "/stock-flows", icon: ArrowLeftRight },
        { title: "Approvisionnement", url: "/restocks", icon: Truck },
        { title: "Points de vente", url: "/pos-overview", icon: Store },
      ],
    },
    {
      label: "Finance",
      items: [
        { title: "Dépenses", url: "/expenses", icon: Receipt },
        { title: "Rapports", url: "/reports", icon: FileBarChart },
        { title: "Exercice comptable", url: "/accounting-periods", icon: CalendarRange },
        { title: "Analyses", url: "/analytics", icon: Sparkles },
      ],
    },
    {
      label: "Admin",
      items: [
        { title: "Équipe", url: "/managers", icon: Users },
        { title: "Activité", url: "/activity", icon: Activity },
        { title: "Paramètres", url: "/settings", icon: Settings },
      ],
    },
  ];

  const managerGroups = [
    {
      label: "Point de vente",
      items: [
        { title: "Tableau de bord", url: "/", icon: LayoutDashboard },
        { title: "Mon stock", url: "/manager-stock", icon: Boxes },
        { title: "Approvisionnement", url: "/manager-investment", icon: ShoppingCart },
        { title: "Dépenses", url: "/manager-expenses", icon: Receipt },
        { title: "Rapport hebdomadaire", url: "/weekly-report", icon: ClipboardList },
        { title: "Pertes / offert", url: "/stock-writeoff", icon: PackageMinus },
      ],
    },
  ];

  const depotGroups = [
    {
      label: "Dépôt",
      items: [
        { title: "Tableau de bord", url: "/", icon: LayoutDashboard },
        { title: "Entrée stock", url: "/depot-restocks", icon: Truck },
        { title: "Dépenses", url: "/depot-expenses", icon: Receipt },
        { title: "Pertes / abîmé", url: "/stock-writeoff", icon: PackageMinus },
        { title: "Stock global", url: "/inventory", icon: Warehouse },
      ],
    },
  ];

  const groups = isCEO ? ceoGroups : isDepot ? depotGroups : managerGroups;

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
            <div className="text-[11px] text-sidebar-foreground/60 tracking-wide">Business OS</div>
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
                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                        <Link to={item.url} className="flex items-center gap-2">
                          <item.icon className="h-4 w-4" />
                          <span className="flex-1 truncate">{item.title}</span>
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
          <div className="text-[11px] uppercase tracking-widest text-sidebar-foreground/60">Exercice</div>
          <div className="mt-1 font-display text-sm font-semibold text-sidebar-primary">{periodLabel}</div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
