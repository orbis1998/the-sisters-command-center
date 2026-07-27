import postgres from "postgres";
import fs from "fs";

const env = fs.readFileSync(".env", "utf8");
const databaseUrl = env
  .split(/\r?\n/)
  .find((line) => line.startsWith("DATABASE_URL="))
  ?.slice("DATABASE_URL=".length);

const sql = postgres(databaseUrl, { ssl: "require", prepare: false });

const investments = await sql`
  SELECT mi.id, mi.date, mi.total_amount, mi.stock_applied,
         json_agg(json_build_object('product_id', mii.erp_product_id, 'qty', mii.quantity)) AS lines
  FROM manager_investments mi
  JOIN manager_investment_items mii ON mii.investment_id = mi.id
  GROUP BY mi.id
  ORDER BY mi.date DESC
  LIMIT 5
`;
console.log("Investments:", JSON.stringify(investments, null, 2));

const products = await sql`
  SELECT name, global_qty FROM erp_products ORDER BY name LIMIT 10
`;
console.log("Products global_qty:", products);

const movements = await sql`SELECT COUNT(*)::int AS n FROM erp_stock_movements`;
console.log("erp_stock_movements count:", movements[0].n);

await sql.end();
