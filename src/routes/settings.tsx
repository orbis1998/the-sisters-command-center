import { Link, createFileRoute } from "@tanstack/react-router";
import { Building2, DollarSign, Shield, UserPlus, type LucideIcon } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRole } from "@/lib/role-context";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [{ title: "Paramètres · The Sisters" }],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { isCEO } = useRole();
  const [saving, setSaving] = useState(false);
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    toast.success("Enregistré");
    setTimeout(() => setSaving(false), 300);
  };

  if (!isCEO) {
    return (
      <div className="space-y-6">
        <PageHeader title="Paramètres" />
        <SectionCard title="Accès restreint">
          <div className="rounded-lg border-2 border-dashed border-warning/40 bg-warning/5 p-8 text-center">
            <Shield className="mx-auto h-8 w-8 text-warning" />
            <p className="mt-3 font-medium">Accès réservé à l'administration.</p>
          </div>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Paramètres" />

      <Tabs defaultValue="company" className="space-y-4">
        <TabsList className="bg-muted">
          <TabsTrigger value="company">Entreprise</TabsTrigger>
          <TabsTrigger value="finance">Finance</TabsTrigger>
          <TabsTrigger value="security">Sécurité</TabsTrigger>
          <TabsTrigger value="managers">Managers</TabsTrigger>
        </TabsList>

        <TabsContent value="company">
          <SectionCard title="Entreprise">
            <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
              <Field label="Raison sociale" placeholder="The Sisters Africa SARL" icon={Building2} />
              <Field label="RCCM" placeholder="CD/KIN/RCCM/..." />
              <Field label="Numéro impôt" placeholder="A2024..." />
              <Field label="Adresse" placeholder="Adresse" />
              <Field label="Téléphone" placeholder="+243..." />
              <Field label="Email" placeholder="contact@..." />
              <div className="md:col-span-2 flex justify-end">
                <Button type="submit" className="bg-primary text-primary-foreground" disabled={saving}>
                  {saving ? "Enregistrement..." : "Enregistrer"}
                </Button>
              </div>
            </form>
          </SectionCard>
        </TabsContent>

        <TabsContent value="finance">
          <SectionCard title="Finance">
            <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
              <Field label="Devise principale" placeholder="USD" icon={DollarSign} />
              <Field label="Devise secondaire" placeholder="CDF" />
              <Field label="Taux TVA" placeholder="16%" />
              <Field label="Exercice fiscal" placeholder="Janvier - Décembre" />
              <div className="md:col-span-2 flex justify-end">
                <Button type="submit" className="bg-primary text-primary-foreground" disabled={saving}>
                  {saving ? "Enregistrement..." : "Enregistrer"}
                </Button>
              </div>
            </form>
          </SectionCard>
        </TabsContent>

        <TabsContent value="security">
          <SectionCard title="Sécurité">
            <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
              <Field label="Durée session" placeholder="15 minutes" />
              <Field label="Niveau de mot de passe" placeholder="Fort" />
              <Field label="Authentification renforcée" placeholder="Oui / Non" />
              <Field label="Journal d'audit" placeholder="Activé" />
              <div className="md:col-span-2 flex justify-end">
                <Button type="submit" className="bg-primary text-primary-foreground" disabled={saving}>
                  {saving ? "Enregistrement..." : "Enregistrer"}
                </Button>
              </div>
            </form>
          </SectionCard>
        </TabsContent>

        <TabsContent value="managers">
          <SectionCard
            title="Managers"
            actions={
              <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90" asChild>
                <Link to="/managers">
                  <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                  Équipe
                </Link>
              </Button>
            }
          >
            <p className="text-sm text-muted-foreground">
              Gérez les badges, l’activation et l’assignation aux points de vente depuis Équipe.
            </p>
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({ label, placeholder, icon: Icon }: { label: string; placeholder: string; icon?: LucideIcon }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-widest text-muted-foreground">{label}</Label>
      <div className="relative">
        {Icon && <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />}
        <Input placeholder={placeholder} className={Icon ? "pl-9" : ""} />
      </div>
    </div>
  );
}
