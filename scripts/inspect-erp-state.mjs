import postgres from "postgres";
import fs from "fs";

const env = fs.readFileSync(".env", "utf8");
const databaseUrl = env
  .split(/\r?\n/)
  .find((line) => line.startsWith("DATABASE_URL="))
  ?.slice("DATABASE_URL=".length);

const sql = postgres(databaseUrl, { ssl: "require", prepare: false });

for (const table of ["depot_receipts", "manager_investments", "manager_investment_items", "inventory_stock", "erp_products"]) {
  const cols = await sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = ${table}
    ORDER BY ordinal_position
  `;
  console.log(`\n${table}:`, cols.map((c) => c.column_name).join(", "));
}

const investments = await sql`SELECT COUNT(*)::int AS n FROM manager_investments`;
const items = await sql`
  SELECT mi.id, mi.date, mi.total_amount, mi.stock_applied, COUNT(mii.id)::int AS lines
  FROM manager_investments mi
  LEFT JOIN manager_investment_items mii ON mii.investment_id = mi.id
  GROUP BY mi.id
  ORDER BY mi.date DESC
  LIMIT 5
`;
console.log("\nRecent investments:", investments[0].n);
console.log(items);

await sql.end();
