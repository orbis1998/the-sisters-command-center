import { createContext, useContext, useState, type ReactNode } from "react";
import type { Role } from "./mock-data";

type RoleCtx = { role: Role; setRole: (r: Role) => void; isCEO: boolean };
const Ctx = createContext<RoleCtx | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>("CEO");
  return <Ctx.Provider value={{ role, setRole, isCEO: role === "CEO" }}>{children}</Ctx.Provider>;
}

export function useRole() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useRole must be used inside RoleProvider");
  return v;
}
