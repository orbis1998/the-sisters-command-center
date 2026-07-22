import { createFileRoute } from "@tanstack/react-router";
import { FileDown, Calendar, Printer } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { monthlyFinancials, expenseBreakdown } from "@/lib/mock-data";
import { fmtUsd } from "@/lib/format";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Rapports · The Sisters Business OS" },
      { name: "description", content: "Rapports financiers, opérationnels et exécutifs exportables." },
    ],
  }),
  component: ReportsPage,
});

const reports = [
  { name: "Compte de résultat", period: "Juillet 2026", status: "Prêt", size: "84 KB" },
  { name: "Bilan comptable", period: "Q2 2026", status: "Prêt", size: "212 KB" },
  { name: "Flux de trésorerie", period: "YTD 2026", status: "Prêt", size: "148 KB" },
  { name: "Rapport ventes par département", period: "Juillet 2026", status: "Prêt", size: "96 KB" },
  { name: "Analyse marges par produit", period: "Q2 2026", status: "En cours", size: "—" },
  { name: "Rapport fiscal RDC", period: "S1 2026", status: "Prêt", size: "324 KB" },
];

export default function _() {}

function ReportsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Intelligence"
        title="Rapports"
        description="Générez et exportez vos rapports comptables, opérationnels et exécutifs."
        actions={
          <>
            <Button variant="outline" size="sm"><Calendar className="mr-1.5 h-3.5 w-3.5" />Période</Button>
            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
              <FileDown className="mr-1.5 h-3.5 w-3.5" />Nouveau rapport
            </Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Revenus mensuels" description="Année 2026">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyFinancials}>
                <CartesianGrid stroke="oklch(0.92 0.01 80)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v/1000}k`} />
                <Tooltip formatter={(v: number) => fmtUsd(v)} contentStyle={{ borderRadius: 8, border: "1px solid oklch(0.9 0.01 80)", fontSize: 12 }} />
                <Bar dataKey="revenue" fill="oklch(0.76 0.13 78)" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Dépenses par catégorie" description="Année 2026">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={expenseBreakdown} layout="vertical">
                <CartesianGrid stroke="oklch(0.92 0.01 80)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v/1000}k`} />
                <YAxis type="category" dataKey="category" tick={{ fontSize: 10 }} width={160} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v: number) => fmtUsd(v)} contentStyle={{ borderRadius: 8, border: "1px solid oklch(0.9 0.01 80)", fontSize: 12 }} />
                <Bar dataKey="amount" fill="oklch(0.42 0.06 55)" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Bibliothèque de rapports" description="Rapports générés récemment">
        <div className="divide-y">
          {reports.map((r) => (
            <div key={r.name} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-3">
              <div className="min-w-0">
                <div className="truncate font-medium text-sm">{r.name}</div>
                <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span>{r.period}</span>
                  <span>·</span>
                  <span>{r.size}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={r.status === "Prêt" ? "outline" : "secondary"} className={r.status === "Prêt" ? "border-success/40 bg-success/10 text-success" : ""}>
                  {r.status}
                </Badge>
                <Button variant="ghost" size="sm" disabled={r.status !== "Prêt"}><Printer className="h-3.5 w-3.5" /></Button>
                <Button variant="outline" size="sm" disabled={r.status !== "Prêt"}><FileDown className="mr-1 h-3.5 w-3.5" />PDF</Button>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
