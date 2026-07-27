import postgres from "postgres";
import fs from "fs";

const env = fs.readFileSync(".env", "utf8");
const databaseUrl = env
  .split(/\r?\n/)
  .find((line) => line.startsWith("DATABASE_URL="))
  ?.slice("DATABASE_URL=".length);

const sql = postgres(databaseUrl, { ssl: "require", prepare: false });

await sql.unsafe(`
  ALTER TABLE public.restocks ALTER COLUMN location_id DROP NOT NULL;

  INSERT INTO public.locations (name, country)
  SELECT 'DEPOT GLOBAL', 'Global'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.locations WHERE name = 'DEPOT GLOBAL'
  );

  ALTER TABLE public.erp_products
    ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'unit',
    ADD COLUMN IF NOT EXISTS global_qty INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_checked DATE;

  NOTIFY pgrst, 'reload schema';
`);

console.log("patch applied");
await sql.end();
