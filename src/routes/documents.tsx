import { createFileRoute } from "@tanstack/react-router";
import { UploadCloud, FileText, FileSpreadsheet, FileIcon, Search } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { documents } from "@/lib/mock-data";

export const Route = createFileRoute("/documents")({
  head: () => ({
    meta: [
      { title: "Documents · The Sisters Business OS" },
      { name: "description", content: "Bibliothèque de factures, contrats, reçus et pièces justificatives." },
    ],
  }),
  component: DocumentsPage,
});

function iconFor(type: string) {
  if (type.includes("Rapport") || type.includes("Inventaire")) return FileSpreadsheet;
  if (type.includes("Contrat")) return FileText;
  return FileIcon;
}

function DocumentsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Opérations"
        title="Documents & pièces jointes"
        description="Centralisez factures, contrats, reçus et bons de livraison."
        actions={
          <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
            <UploadCloud className="mr-1.5 h-3.5 w-3.5" />Téléverser
          </Button>
        }
      />

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Rechercher un document…" className="h-9 pl-9 bg-muted/40" />
      </div>

      <SectionCard title="Bibliothèque">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {documents.map((d) => {
            const Icon = iconFor(d.type);
            return (
              <div key={d.name} className="group cursor-pointer rounded-lg border bg-card p-4 transition-all hover:border-accent/40 hover:shadow-md">
                <div className="flex items-start justify-between">
                  <div className="grid h-10 w-10 place-items-center rounded-md bg-primary text-primary-foreground">
                    <Icon className="h-5 w-5" />
                  </div>
                  <Badge variant="outline" className="text-[10px]">{d.type}</Badge>
                </div>
                <div className="mt-3 truncate font-medium text-sm">{d.name}</div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{d.date}</span>
                  <span>{d.size}</span>
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">par {d.owner}</div>
              </div>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
}
