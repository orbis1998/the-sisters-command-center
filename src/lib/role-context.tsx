import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { supabase } from "./supabase-client";
import { User } from "@supabase/supabase-js";

export type Role = "ceo" | "manager" | "depot" | "loading" | "unauthorized";

export type Manager = {
  id: string;
  name: string;
  location_id?: string;
};

export type DepotAccount = {
  id: string;
  name: string;
  location_id?: string;
  report_manager_id?: string;
};

type RoleCtx = {
  role: Role;
  user: User | null;
  manager: Manager | null;
  depotAccount: DepotAccount | null;
  isCEO: boolean;
  isManager: boolean;
  isDepot: boolean;
  isLoading: boolean;
  loginAsBadge: (badge: string) => Promise<boolean>;
  /** @deprecated use loginAsBadge */
  loginAsManager: (badge: string) => Promise<boolean>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<RoleCtx | null>(null);

const BADGE_KEY = "manager_badge";
const ROLE_KEY = "erp_badge_role";

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [manager, setManager] = useState<Manager | null>(null);
  const [depotAccount, setDepotAccount] = useState<DepotAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const badge = localStorage.getItem(BADGE_KEY);
        if (!badge) {
          setUser(session.user);
          setRole("ceo");
          setManager(null);
          setDepotAccount(null);
          setIsLoading(false);
          return;
        }
      }
      void checkBadgeSession();
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAuth = async () => {
    const badge = localStorage.getItem(BADGE_KEY);
    if (badge) {
      const ok = await loginAsBadge(badge);
      if (ok) return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user) {
      setUser(session.user);
      setRole("ceo");
      setManager(null);
      setDepotAccount(null);
    } else {
      setRole("unauthorized");
      setUser(null);
      setManager(null);
      setDepotAccount(null);
    }
    setIsLoading(false);
  };

  const checkBadgeSession = async () => {
    const badge = localStorage.getItem(BADGE_KEY);
    if (badge) {
      await loginAsBadge(badge);
    } else {
      setRole("unauthorized");
      setUser(null);
      setManager(null);
      setDepotAccount(null);
      setIsLoading(false);
    }
  };

  const loginAsDepot = async (badge: string) => {
    const { data, error } = await supabase
      .from("erp_depot_accounts")
      .select("id, name, badge_code, is_active, location_id, report_manager_id")
      .eq("badge_code", badge)
      .maybeSingle();

    if (error || !data || data.is_active === false) return false;

    localStorage.setItem(BADGE_KEY, badge);
    localStorage.setItem(ROLE_KEY, "depot");
    setUser(null);
    setManager(null);
    setDepotAccount({
      id: data.id,
      name: data.name || "Dépôt",
      location_id: data.location_id || undefined,
      report_manager_id: data.report_manager_id || undefined,
    });
    setRole("depot");
    return true;
  };

  const loginAsBadge = async (badge: string) => {
    setIsLoading(true);
    try {
      // 1) Manager by badge_code
      let { data, error } = await supabase
        .from("user_roles")
        .select("id, name, location_id, is_active, badge_code, role, user_id")
        .eq("badge_code", badge)
        .eq("role", "manager")
        .maybeSingle();

      // 2) Fallback profiles.badge_id
      if (!data) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, full_name, badge_id, pos_id")
          .eq("badge_id", badge)
          .maybeSingle();

        if (profile) {
          const roleLookup = await supabase
            .from("user_roles")
            .select("id, name, location_id, is_active, badge_code, role, user_id")
            .eq("user_id", profile.id)
            .eq("role", "manager")
            .maybeSingle();

          data = roleLookup.data
            ? {
                ...roleLookup.data,
                name: roleLookup.data.name || profile.full_name,
                location_id: roleLookup.data.location_id || profile.pos_id,
              }
            : null;
          error = roleLookup.error;
        }
      }

      if (!error && data && data.is_active !== false) {
        localStorage.setItem(BADGE_KEY, badge);
        localStorage.setItem(ROLE_KEY, "manager");
        setUser(null);
        setDepotAccount(null);
        setManager({
          id: data.id,
          name: data.name || "Manager",
          location_id: data.location_id || undefined,
        });
        setRole("manager");
        return true;
      }

      // 3) Depot account
      const depotOk = await loginAsDepot(badge);
      if (depotOk) return true;

      localStorage.removeItem(BADGE_KEY);
      localStorage.removeItem(ROLE_KEY);
      setRole("unauthorized");
      setUser(null);
      setManager(null);
      setDepotAccount(null);
      return false;
    } catch (err) {
      console.error("Failed to login with badge", err);
      setRole("unauthorized");
      setUser(null);
      setManager(null);
      setDepotAccount(null);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    localStorage.removeItem(BADGE_KEY);
    localStorage.removeItem(ROLE_KEY);
    if (role === "ceo") {
      await supabase.auth.signOut();
    } else {
      setRole("unauthorized");
      setManager(null);
      setDepotAccount(null);
      setUser(null);
    }
  };

  return (
    <Ctx.Provider
      value={{
        role,
        user,
        manager,
        depotAccount,
        isCEO: role === "ceo",
        isManager: role === "manager",
        isDepot: role === "depot",
        isLoading,
        loginAsBadge,
        loginAsManager: loginAsBadge,
        signOut,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useRole() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useRole must be used inside RoleProvider");
  return v;
}
