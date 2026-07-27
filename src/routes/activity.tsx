import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { Activity } from "lucide-react";

export const Route = createFileRoute("/activity")({
  head: () => ({
    meta: [{ title: "Activité · The Sisters" }],
  }),
  component: ActivityPage,
});

function ActivityPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Activité" />
      <SectionCard title="Actions récentes">
        <div className="rounded-lg border-2 border-dashed p-12 text-center">
          <Activity className="mx-auto h-8 w-8 text-muted-foreground/50" />
          <p className="mt-3 text-sm text-muted-foreground">Aucune activité pour le moment.</p>
        </div>
      </SectionCard>
    </div>
  );
}
