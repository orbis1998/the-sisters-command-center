import postgres from "postgres";
import fs from "fs";
import path from "path";

const env = fs.readFileSync(".env", "utf8");
const databaseUrl = env
  .split(/\r?\n/)
  .find((line) => line.startsWith("DATABASE_URL="))
  ?.slice("DATABASE_URL=".length);

const sql = postgres(databaseUrl, { ssl: "require", prepare: false });
const file = "00007_erp_products_and_managers_fix.sql";
const text = fs.readFileSync(path.join("supabase", "migrations", file), "utf8");

console.log("Applying", file);
await sql.unsafe(text);

// Sync badge codes from profiles into user_roles for manager login
await sql.unsafe(`
  UPDATE public.user_roles ur
  SET badge_code = p.badge_id,
      name = COALESCE(ur.name, p.full_name)
  FROM public.profiles p
  WHERE p.id = ur.user_id
    AND ur.role = 'manager'::app_role
    AND p.badge_id IS NOT NULL
`);

// Seed ERP locations from points_of_sale if empty
const locCount = await sql`select count(*)::int as count from locations`;
if (locCount[0].count === 0) {
  await sql.unsafe(`
    INSERT INTO public.locations (id, name, country)
    SELECT id, name,
      CASE
        WHEN city_scope IN ('brazzaville', 'pointe-noire') THEN 'Congo'
        ELSE 'RDC'
      END
    FROM public.points_of_sale
    ON CONFLICT (id) DO NOTHING
  `);
}

const managers = await sql`select id, name, badge_code, is_active from erp_managers order by name`;
console.log("ERP_MANAGERS", managers);

const erpProductsCount = await sql`select count(*)::int as count from erp_products`;
console.log("ERP_PRODUCTS", erpProductsCount[0]);

await sql.end();
console.log("Done");
