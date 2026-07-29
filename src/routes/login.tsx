import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Eye, EyeOff, KeyRound, Loader2, Mail } from "lucide-react";
import { useRole } from "@/lib/role-context";

export const Route = createFileRoute("/login")({
  component: Login,
});

function Login() {
  const [identifier, setIdentifier] = useState("");
  const [secret, setSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { loginAsManager } = useRole();

  const isEmailLike = (value: string) => value.includes("@");

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const cleanedIdentifier = identifier.trim();
      const cleanedSecret = secret.trim();

      if (!cleanedIdentifier) {
        toast.error("Identifiant requis");
        return;
      }

      if (isEmailLike(cleanedIdentifier)) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanedIdentifier,
          password: cleanedSecret,
        });
        if (error) throw error;
        if (data.user) {
          localStorage.removeItem("manager_badge");
          toast.success("Connexion réussie");
          router.navigate({ to: "/" });
        }
      } else {
        const badge = cleanedSecret || cleanedIdentifier;
        const success = await loginAsManager(badge);
        if (success) {
          toast.success("Connexion réussie");
          router.navigate({ to: "/" });
        } else {
          toast.error("Badge invalide ou compte inactif");
        }
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erreur de connexion";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-shell relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <div className="login-glow login-glow-left" aria-hidden />
      <div className="login-glow login-glow-right" aria-hidden />

      <div className="relative z-10 w-full max-w-[420px]">
        <div className="login-card">
          <div className="mb-6 text-center">
            <div className="login-brand font-display text-xl font-semibold text-foreground md:text-2xl">
              The sister Africa Business OS
            </div>
            <div className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">
              Accès administration & point de vente
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="identifier" className="text-xs uppercase tracking-widest text-muted-foreground">
                Email ou badge
              </Label>
              <div className="relative">
                {isEmailLike(identifier) ? (
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                ) : (
                  <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                )}
                <Input
                  id="identifier"
                  type="text"
                  className="login-input pl-9"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="secret" className="text-xs uppercase tracking-widest text-muted-foreground">
                Mot de passe
              </Label>
              <div className="relative">
                <Input
                  id="secret"
                  type={showSecret ? "text" : "password"}
                  className="login-input pr-10"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={showSecret ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                  {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="login-submit w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connexion...
                </>
              ) : (
                "Se connecter"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
