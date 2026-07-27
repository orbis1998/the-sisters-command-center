import postgres from "postgres";
import fs from "fs";

const env = fs.readFileSync(".env", "utf8");
const databaseUrl = env
  .split(/\r?\n/)
  .find((line) => line.startsWith("DATABASE_URL="))
  ?.slice("DATABASE_URL=".length);

const sql = postgres(databaseUrl, { ssl: "require", prepare: false });

const before = await sql`select count(*)::int as count from locations`;
console.log("LOCATIONS_BEFORE", before[0]);

await sql.unsafe(`
  INSERT INTO public.locations (id, name, country)
  SELECT id, name,
    CASE
      WHEN city_scope IN ('brazzaville', 'pointe-noire') THEN 'Congo'
      ELSE 'RDC'
    END
  FROM public.points_of_sale
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, country = EXCLUDED.country
`);

const after = await sql`select id, name, country from locations order by name`;
console.log("LOCATIONS", after);

// Test ERP product insert as would happen from app
const inserted = await sql`
  insert into erp_products (sku, name, category, unit_purchase_price, selling_price, min_stock)
  values ('TSA-TEST-001', 'Test ERP Product', 'Test', 10, 20, 5)
  on conflict (sku) do update set name = excluded.name
  returning id, sku, name
`;
console.log("TEST_PRODUCT", inserted[0]);

await sql`delete from erp_products where sku = 'TSA-TEST-001'`;
console.log("CLEANED_TEST_PRODUCT");

await sql.end();
