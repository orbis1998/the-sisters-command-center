import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import { Users, Badge as BadgeIcon, Copy, Check } from "lucide-react";
import { useRole } from "@/lib/role-context";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase-client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/managers")({
  component: ManagersPage,
});

type ManagerData = {
  id: string;
  user_id: string | null;
  name: string;
  badge_code: string | null;
  location_id: string | null;
  is_active: boolean;
  phone: string | null;
  city_scope: string | null;
};

type Location = { id: string; name: string; country: string };

function ManagersPage() {
  const { isCEO } = useRole();
  const [managers, setManagers] = useState<ManagerData[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: managerRows, error }, { data: locationRows }] = await Promise.all([
      supabase
        .from("erp_managers")
        .select("id, user_id, name, badge_code, location_id, is_active, phone, city_scope")
        .order("name"),
      supabase.from("locations").select("id, name, country").order("name"),
    ]);

    if (error) {
      toast.error(error.message || "Impossible de charger les managers");
    } else {
      setManagers((managerRows || []) as ManagerData[]);
    }
    setLocations((locationRows || []) as Location[]);
    setLoading(false);
  };

  useEffect(() => {
    if (isCEO) void fetchAll();
  }, [isCEO]);

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase.from("user_roles").update({ is_active: !currentStatus }).eq("id", id);
    if (error) {
      toast.error("Mise à jour impossible");
      return;
    }
    setManagers((prev) => prev.map((m) => (m.id === id ? { ...m, is_active: !currentStatus } : m)));
    toast.success(!currentStatus ? "Compte activé" : "Compte désactivé");
  };

  const assignLocation = async (managerId: string, locationId: string) => {
    const value = locationId || null;
    const { error } = await supabase.from("user_roles").update({ location_id: value }).eq("id", managerId);
    if (error) {
      toast.error(error.message || "Assignation impossible");
      return;
    }
    setManagers((prev) => prev.map((m) => (m.id === managerId ? { ...m, location_id: value } : m)));
    toast.success("Point de vente mis à jour");
  };

  const copyBadge = (code: string | null, id: string) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    toast.success("Badge copié");
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!isCEO) return <div className="p-8 text-center">Accès réservé à l'administration.</div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Équipe" />

      <SectionCard title="Managers" description={`${managers.length} comptes`}>
        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Chargement...</div>
        ) : managers.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed p-12 text-center">
            <Users className="mx-auto h-8 w-8 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">Aucun manager.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {managers.map((manager) => (
              <div key={manager.id} className="flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-muted font-display text-xs font-semibold">
                    {(manager.name || "MA").substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {manager.name}
                      <Badge variant={manager.is_active ? "default" : "secondary"}>
                        {manager.is_active ? "Actif" : "Inactif"}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <BadgeIcon className="h-3 w-3" />
                      <span className="font-mono">{manager.badge_code || "—"}</span>
                      {manager.badge_code && (
                        <button onClick={() => copyBadge(manager.badge_code, manager.id)} className="ml-1">
                          {copiedId === manager.id ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <select
                    className="flex h-9 min-w-[220px] rounded-md border border-input bg-transparent px-3 text-sm"
                    value={manager.location_id || ""}
                    onChange={(e) => assignLocation(manager.id, e.target.value)}
                  >
                    <option value="">Point de vente</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                  <Button variant="outline" size="sm" onClick={() => toggleStatus(manager.id, manager.is_active)}>
                    {manager.is_active ? "Désactiver" : "Activer"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
