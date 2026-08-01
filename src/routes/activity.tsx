import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { Badge } from "@/components/ui/badge";
import { useRole } from "@/lib/role-context";
import { loadCeoActivityFeed, type ActivityItem } from "@/lib/activity-feed";

export const Route = createFileRoute("/activity")({
  head: () => ({
    meta: [{ title: "Activité · The Sisters" }],
  }),
  component: ActivityPage,
});

function ActivityPage() {
  const { isCEO } = useRole();
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isCEO) {
      setLoading(false);
      return;
    }
    let mounted = true;
    void loadCeoActivityFeed(100)
      .then((rows) => {
        if (mounted) setItems(rows);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [isCEO]);

  if (!isCEO) {
    return <div className="p-8 text-center">Accès réservé à l&apos;administration.</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Activité" />

      <SectionCard title="Actions récentes">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Chargement…
          </div>
        ) : items.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Aucune activité pour le moment. Les approvisionnements, rapports, dépenses et mouvements
            stock apparaîtront ici.
          </p>
        ) : (
          <ul className="divide-y">
            {items.map((item) => (
              <li key={item.id}>
                <Link
                  to={item.href}
                  className="flex items-start justify-between gap-4 px-1 py-3 transition-colors hover:bg-muted/40"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                        {item.kind}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{item.at}</span>
                    </div>
                    <div className="mt-1 truncate font-medium">{item.title}</div>
                    <div className="mt-0.5 truncate text-xs text-muted-foreground">{item.detail}</div>
                  </div>
                  {item.amountLabel && (
                    <div className="shrink-0 font-mono text-sm font-semibold">{item.amountLabel}</div>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
