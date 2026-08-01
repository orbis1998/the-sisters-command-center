import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Search, Command, Bell, LogOut, User as UserIcon, ArrowLeftRight, Loader2 } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useRole } from "@/lib/role-context";
import {
  loadStockMovements,
  movementNotificationHref,
  type StockMovementRow,
} from "@/lib/accounting";
import { fmtNum } from "@/lib/format";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function TopBar() {
  const { role, user, manager, depotAccount, isCEO, isDepot, isManager, signOut } = useRole();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [movements, setMovements] = useState<StockMovementRow[]>([]);

  const userInitials =
    role === "ceo"
      ? user?.email?.substring(0, 2).toUpperCase() || "CE"
      : role === "depot"
        ? "DP"
        : manager?.name?.substring(0, 2).toUpperCase() || "MG";
  const userLabel = role === "ceo" ? "CEO" : role === "depot" ? "Dépôt" : "Manager";
  const displayName =
    role === "ceo" ? user?.email : role === "depot" ? depotAccount?.name || "Dépôt" : manager?.name || "Manager";

  const viewerRole = isCEO ? "ceo" : isDepot ? "depot" : "manager";

  const loadOptions = () => {
    if (isCEO) return { scope: "all" as const };
    if (isDepot) return { scope: "depot" as const };
    if (isManager) return { scope: "pos" as const, locationId: manager?.location_id ?? null };
    return { scope: "all" as const };
  };

  const subtitle = isCEO
    ? "Tous les mouvements"
    : isDepot
      ? "Mouvements du dépôt"
      : "Mouvements de votre POS";

  const refresh = async () => {
    if (role === "loading" || role === "unauthorized") return;
    const rows = await loadStockMovements(40, loadOptions());
    setMovements(rows);
  };

  useEffect(() => {
    void refresh();
  }, [role, manager?.location_id, isCEO, isDepot, isManager]);

  useEffect(() => {
    if (!open) return;
    let mounted = true;
    setLoading(true);
    void loadStockMovements(40, loadOptions())
      .then((rows) => {
        if (mounted) setMovements(rows);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [open, role, manager?.location_id, isCEO, isDepot, isManager]);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-md">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="h-5" />

      <div className="relative hidden max-w-md flex-1 md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Rechercher inventaire, rapports, points de vente…"
          className="h-9 border-border/70 bg-muted/40 pl-9 pr-14 text-sm"
        />
        <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 items-center gap-1 rounded border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground md:inline-flex">
          <Command className="h-3 w-3" /> K
        </kbd>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
              <Bell className="h-4 w-4" />
              {movements.length > 0 && (
                <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
                  {movements.length > 9 ? "9+" : movements.length}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-[360px] p-0 sm:w-[420px]">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="flex items-center gap-2">
                <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">Notifications</div>
                  <div className="text-[11px] text-muted-foreground">{subtitle}</div>
                </div>
              </div>
              {isCEO && (
                <Button asChild variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setOpen(false)}>
                  <Link to="/stock-flows">Voir tout</Link>
                </Button>
              )}
            </div>

            <div className="max-h-[360px] overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Chargement…
                </div>
              ) : movements.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">Aucune notification.</p>
              ) : (
                <ul className="divide-y">
                  {movements.map((row) => {
                    const href = movementNotificationHref(row.movementTypeKey, viewerRole);
                    return (
                      <li key={row.id}>
                        <Link
                          to={href}
                          onClick={() => setOpen(false)}
                          className="block px-4 py-3 text-sm transition-colors hover:bg-muted/60"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="truncate font-medium">{row.productName}</div>
                              <div className="mt-0.5 text-xs text-muted-foreground">
                                {row.movementType} · {row.locationName}
                              </div>
                              <div className="mt-0.5 text-[11px] text-muted-foreground">{row.date}</div>
                            </div>
                            <div
                              className={`shrink-0 font-mono text-sm font-semibold ${
                                row.quantityChange > 0 ? "text-emerald-700" : "text-destructive"
                              }`}
                            >
                              {row.quantityChange > 0 ? "+" : ""}
                              {fmtNum(row.quantityChange)}
                            </div>
                          </div>
                          {row.notes && (
                            <div className="mt-1 truncate text-[11px] text-muted-foreground">{row.notes}</div>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </PopoverContent>
        </Popover>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-9 gap-2 px-2">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden text-left leading-tight sm:block">
                <div className="max-w-[120px] truncate text-xs font-medium">{displayName}</div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{userLabel}</div>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Mon Compte</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <UserIcon className="mr-2 h-4 w-4" />
              <span>Profil</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Se déconnecter</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
