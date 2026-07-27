import postgres from "postgres";
import fs from "fs";

const env = fs.readFileSync(".env", "utf8");
const databaseUrl = env
  .split(/\r?\n/)
  .find((line) => line.startsWith("DATABASE_URL="))
  ?.slice("DATABASE_URL=".length);

const sql = postgres(databaseUrl, { ssl: "require", prepare: false });
const cols = await sql`
  SELECT column_name
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'stock_movements'
  ORDER BY ordinal_position
`;
console.log(cols.map((c) => c.column_name).join(", "));
await sql.end();
