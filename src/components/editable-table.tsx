import { useState } from "react";
import { cn } from "@/lib/utils";

export type Column<T> = {
  key: keyof T & string;
  label: string;
  width?: string;
  align?: "left" | "right" | "center";
  format?: (v: T[keyof T], row: T) => string;
  editable?: boolean;
  type?: "text" | "number";
  readOnly?: boolean;
};

export function EditableTable<T extends Record<string, unknown>>({
  columns,
  data,
  canEdit = true,
}: {
  columns: Column<T>[];
  data: T[];
  canEdit?: boolean;
}) {
  const [rows, setRows] = useState(data);
  const [editing, setEditing] = useState<{ r: number; c: string } | null>(null);

  const commit = (r: number, key: string, value: string) => {
    setRows((prev) => {
      const next = [...prev];
      const col = columns.find((c) => c.key === key);
      const parsed = col?.type === "number" ? Number(value) : value;
      next[r] = { ...next[r], [key]: parsed } as T;
      return next;
    });
    setEditing(null);
  };

  return (
    <div className="card-elevated overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="w-10 border-r px-2 py-2 text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                #
              </th>
              {columns.map((c) => (
                <th
                  key={c.key}
                  style={{ width: c.width }}
                  className={cn(
                    "border-r px-3 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground last:border-r-0",
                    c.align === "right" && "text-right",
                    c.align === "center" && "text-center",
                    (!c.align || c.align === "left") && "text-left",
                  )}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={String(row.id ?? ri)} className="group border-b last:border-b-0 hover:bg-accent/[0.04]">
                <td className="w-10 border-r bg-muted/20 px-2 py-1.5 text-center text-[11px] text-muted-foreground">
                  {ri + 1}
                </td>
                {columns.map((c) => {
                  const raw = row[c.key];
                  const display = c.format ? c.format(raw, row) : String(raw ?? "");
                  const isEditing = editing?.r === ri && editing.c === c.key;
                  const editable = canEdit && c.editable && !c.readOnly;
                  return (
                    <td
                      key={c.key}
                      className={cn(
                        "relative border-r px-3 py-1.5 tabular-nums last:border-r-0",
                        c.align === "right" && "text-right",
                        c.align === "center" && "text-center",
                        editable && "cursor-cell",
                        isEditing && "ring-2 ring-inset ring-accent",
                      )}
                      onDoubleClick={() => editable && setEditing({ r: ri, c: c.key })}
                    >
                      {isEditing ? (
                        <input
                          autoFocus
                          type={c.type === "number" ? "number" : "text"}
                          defaultValue={String(raw ?? "")}
                          onBlur={(e) => commit(ri, c.key, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commit(ri, c.key, (e.target as HTMLInputElement).value);
                            if (e.key === "Escape") setEditing(null);
                          }}
                          className="w-full bg-transparent outline-none"
                        />
                      ) : (
                        display
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {canEdit && (
        <div className="flex items-center justify-between border-t bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
          <span>Double-cliquez sur une cellule pour éditer · Entrée pour valider · Échap pour annuler</span>
          <span>{rows.length} lignes</span>
        </div>
      )}
    </div>
  );
}
