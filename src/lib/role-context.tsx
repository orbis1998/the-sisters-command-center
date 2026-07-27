import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { supabase } from "./supabase-client";
import { User } from "@supabase/supabase-js";

export type Role = "ceo" | "manager" | "loading" | "unauthorized";

export type Manager = {
  id: string;
  name: string;
  location_id?: string;
};

type RoleCtx = { 
  role: Role; 
  user: User | null;
  manager: Manager | null;
  isCEO: boolean;
  isLoading: boolean;
  loginAsManager: (badge: string) => Promise<boolean>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<RoleCtx | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [manager, setManager] = useState<Manager | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const badge = localStorage.getItem("manager_badge");
        if (!badge) {
          setUser(session.user);
          setRole("ceo");
          setManager(null);
          setIsLoading(false);
          return;
        }
      }

      checkManagerSession();
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAuth = async () => {
    const badge = localStorage.getItem("manager_badge");
    if (badge) {
      const managerLogged = await loginAsManager(badge);
      if (managerLogged) {
        return;
      }
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setUser(session.user);
      setRole("ceo");
      setManager(null);
    } else {
      setRole("unauthorized");
      setUser(null);
      setManager(null);
    }
    setIsLoading(false);
  };

  const checkManagerSession = async () => {
    const badge = localStorage.getItem("manager_badge");
    if (badge) {
      await loginAsManager(badge);
    } else {
      setRole("unauthorized");
      setUser(null);
      setManager(null);
      setIsLoading(false);
    }
  };

  const loginAsManager = async (badge: string) => {
    setIsLoading(true);
    try {
      // 1) Prefer synced badge_code on user_roles
      let { data, error } = await supabase
        .from("user_roles")
        .select("id, name, location_id, is_active, badge_code, role, user_id")
        .eq("badge_code", badge)
        .eq("role", "manager")
        .maybeSingle();

      // 2) Fallback to profiles.badge_id (source of truth on the official site)
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

      if (error || !data || data.is_active === false) {
        localStorage.removeItem("manager_badge");
        setRole("unauthorized");
        setUser(null);
        setManager(null);
        return false;
      }

      localStorage.setItem("manager_badge", badge);
      setUser(null);
      setManager({
        id: data.id,
        name: data.name || "Manager",
        location_id: data.location_id || undefined,
      });
      setRole("manager");
      return true;
    } catch (err) {
      console.error("Failed to login as manager", err);
      setRole("unauthorized");
      setUser(null);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    localStorage.removeItem("manager_badge");
    if (role === "ceo") {
      await supabase.auth.signOut();
    } else {
      setRole("unauthorized");
      setManager(null);
      setUser(null);
    }
  };

  return (
    <Ctx.Provider value={{ 
      role, 
      user, 
      manager,
      isCEO: role === "ceo", 
      isLoading,
      loginAsManager,
      signOut
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useRole() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useRole must be used inside RoleProvider");
  return v;
}
