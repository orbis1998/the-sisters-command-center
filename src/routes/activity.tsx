import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { Badge } from "@/components/ui/badge";
import { activityLog } from "@/lib/mock-data";

export const Route = createFileRoute("/activity")({
  head: () => ({
    meta: [
      { title: "Journal d'activité · The Sisters Business OS" },
      { name: "description", content: "Audit trail des actions utilisateurs." },
    ],
  }),
  component: ActivityPage,
});

function ActivityPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Journal d'activité"
        description="Piste d'audit complète des actions effectuées dans le système."
      />
      <SectionCard title="Actions récentes">
        <div className="relative pl-6">
          <div className="absolute left-2 top-2 bottom-2 w-px bg-border" />
          <div className="space-y-6">
            {activityLog.map((a, i) => (
              <div key={i} className="relative">
                <div className="absolute -left-[18px] top-1.5 h-3 w-3 rounded-full border-2 border-background bg-accent" />
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                  <div className="min-w-0">
                    <div className="text-sm">
                      <span className="font-semibold">{a.user}</span>{" "}
                      <span className="text-muted-foreground">{a.action}</span>{" "}
                      <span className="font-medium">{a.target}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] uppercase tracking-wider">{a.role}</Badge>
                      <span className="text-[11px] text-muted-foreground">{a.time}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
