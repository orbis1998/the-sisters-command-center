import { createFileRoute } from "@tanstack/react-router";
import { AlertCircle, AlertTriangle, Info, CheckCircle2, BellRing } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { alerts } from "@/lib/mock-data";

export const Route = createFileRoute("/alerts")({
  head: () => ({
    meta: [
      { title: "Alertes · The Sisters Business OS" },
      { name: "description", content: "Notifications intelligentes, seuils critiques et signaux d'action." },
    ],
  }),
  component: AlertsPage,
});

const config: Record<string, { icon: typeof AlertCircle; className: string; label: string }> = {
  critical: { icon: AlertCircle, className: "text-destructive border-destructive/30 bg-destructive/5", label: "Critique" },
  warning:  { icon: AlertTriangle, className: "text-warning border-warning/30 bg-warning/5", label: "Attention" },
  info:     { icon: Info, className: "text-foreground border-border bg-muted/30", label: "Info" },
  success:  { icon: CheckCircle2, className: "text-success border-success/30 bg-success/5", label: "Succès" },
};

function AlertsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Intelligence"
        title="Alertes & notifications"
        description="Signaux automatiques sur stocks, marges, budgets et flux de trésorerie."
        actions={<Button variant="outline" size="sm"><BellRing className="mr-1.5 h-3.5 w-3.5" />Configurer</Button>}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {["critical","warning","info","success"].map((lvl) => {
          const count = alerts.filter(a => a.level === lvl).length;
          const c = config[lvl];
          const Icon = c.icon;
          return (
            <div key={lvl} className={`rounded-lg border p-4 ${c.className}`}>
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wider">{c.label}</span>
              </div>
              <div className="mt-2 font-display text-3xl font-semibold">{count}</div>
            </div>
          );
        })}
      </div>

      <SectionCard title="Flux d'alertes" description="Ordre chronologique">
        <div className="divide-y">
          {alerts.map((a) => {
            const c = config[a.level];
            const Icon = c.icon;
            return (
              <div key={a.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-4 py-4">
                <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-md border ${c.className}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-sm">{a.title}</span>
                    <Badge variant="outline" className="text-[10px] uppercase tracking-wider">{c.label}</Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{a.detail}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground/70">{a.time}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm">Ignorer</Button>
                  <Button variant="outline" size="sm">Traiter</Button>
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
}
