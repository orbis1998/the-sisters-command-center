import { createFileRoute } from "@tanstack/react-router";
import { UserPlus, Building2, Shield, DollarSign } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { users } from "@/lib/mock-data";
import { useRole } from "@/lib/role-context";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Paramètres · The Sisters Business OS" },
      { name: "description", content: "Gestion des utilisateurs, permissions et paramètres de l'entreprise." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { isCEO } = useRole();

  if (!isCEO) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Administration" title="Paramètres" />
        <SectionCard title="Accès restreint">
          <div className="rounded-lg border-2 border-dashed border-warning/40 bg-warning/5 p-8 text-center">
            <Shield className="mx-auto h-8 w-8 text-warning" />
            <p className="mt-3 font-medium">Cette section est réservée au CEO.</p>
            <p className="mt-1 text-xs text-muted-foreground">Contactez The Sisters pour toute modification.</p>
          </div>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Paramètres"
        description="Gestion de l'entreprise, des utilisateurs et des permissions."
      />

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="bg-muted">
          <TabsTrigger value="users">Utilisateurs</TabsTrigger>
          <TabsTrigger value="company">Entreprise</TabsTrigger>
          <TabsTrigger value="finance">Finance</TabsTrigger>
          <TabsTrigger value="security">Sécurité</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <SectionCard
            title="Gestion des utilisateurs"
            description="Rôles CEO et Accountant"
            actions={<Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90"><UserPlus className="mr-1.5 h-3.5 w-3.5" />Inviter</Button>}
          >
            <div className="divide-y">
              {users.map((u) => (
                <div key={u.email} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 py-3">
                  <Avatar>
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                      {u.name.split(" ").map(s => s[0]).join("").slice(0,2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="truncate font-medium text-sm">{u.name}</div>
                    <div className="truncate text-xs text-muted-foreground">{u.email}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={u.role === "CEO" ? "default" : "secondary"} className={u.role === "CEO" ? "bg-accent text-accent-foreground hover:bg-accent/90" : ""}>
                      {u.role}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">{u.status}</Badge>
                    <span className="hidden text-[11px] text-muted-foreground sm:block">{u.last}</span>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="company">
          <SectionCard title="Informations entreprise" description="Coordonnées et paramètres légaux">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Raison sociale" defaultValue="The Sisters Africa SARL" icon={Building2} />
              <Field label="RCCM" defaultValue="CD/KIN/RCCM/22-B-01234" />
              <Field label="Numéro impôt" defaultValue="A2024567890K" />
              <Field label="Adresse" defaultValue="Av. Kasa-Vubu, Kinshasa, RDC" />
              <Field label="Téléphone" defaultValue="+243 810 000 000" />
              <Field label="Email" defaultValue="contact@thesistersafrica.com" />
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" size="sm">Annuler</Button>
              <Button size="sm" className="bg-primary text-primary-foreground">Enregistrer</Button>
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="finance">
          <SectionCard title="Paramètres financiers" description="Devise, taxes et périodes comptables">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Devise principale" defaultValue="USD" icon={DollarSign} />
              <Field label="Devise secondaire" defaultValue="CDF (Franc Congolais)" />
              <Field label="Taux TVA" defaultValue="16%" />
              <Field label="Exercice fiscal" defaultValue="Janvier - Décembre" />
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="security">
          <SectionCard title="Sécurité & permissions" description="Authentification et politiques d'accès">
            <div className="space-y-4">
              {[
                { title: "Authentification à deux facteurs", desc: "Requise pour tous les utilisateurs CEO", enabled: true },
                { title: "Journal d'audit", desc: "Toutes les actions sont tracées et horodatées", enabled: true },
                { title: "Verrouillage automatique", desc: "Après 15 minutes d'inactivité", enabled: true },
                { title: "IP whitelist", desc: "Restreindre l'accès à certaines adresses IP", enabled: false },
              ].map((s) => (
                <div key={s.title} className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <div className="font-medium text-sm">{s.title}</div>
                    <div className="text-xs text-muted-foreground">{s.desc}</div>
                  </div>
                  <Badge variant={s.enabled ? "default" : "outline"} className={s.enabled ? "bg-success/15 text-success hover:bg-success/20" : ""}>
                    {s.enabled ? "Activé" : "Désactivé"}
                  </Badge>
                </div>
              ))}
            </div>
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({ label, defaultValue, icon: Icon }: { label: string; defaultValue: string; icon?: typeof Building2 }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-widest text-muted-foreground">{label}</Label>
      <div className="relative">
        {Icon && <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />}
        <Input defaultValue={defaultValue} className={Icon ? "pl-9" : ""} />
      </div>
    </div>
  );
}
