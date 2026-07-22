import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  delta,
  icon: Icon,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  delta?: number;
  icon?: LucideIcon;
  hint?: string;
  tone?: "default" | "gold";
}) {
  const positive = (delta ?? 0) >= 0;
  return (
    <div
      className={cn(
        "card-elevated relative overflow-hidden p-5",
        tone === "gold" && "border-accent/30",
      )}
    >
      {tone === "gold" && (
        <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-accent/10 blur-2xl" />
      )}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
        {Icon && (
          <div className="grid h-8 w-8 place-items-center rounded-md bg-muted/60 text-foreground/70">
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
      <div className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground">
        {value}
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs">
        {typeof delta === "number" && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-medium",
              positive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive",
            )}
          >
            {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(delta).toFixed(1)}%
          </span>
        )}
        {hint && <span className="text-muted-foreground">{hint}</span>}
      </div>
    </div>
  );
}
