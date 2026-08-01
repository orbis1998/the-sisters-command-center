import postgres from "postgres";
import fs from "fs";
import path from "path";

const env = fs.readFileSync(".env", "utf8");
const databaseUrl = env
  .split(/\r?\n/)
  .find((line) => line.startsWith("DATABASE_URL="))
  ?.slice("DATABASE_URL=".length);

const sql = postgres(databaseUrl, { ssl: "require", prepare: false });
const text = fs.readFileSync(
  path.join("supabase", "migrations", "00015_depot_account_and_manager_ceo_expenses.sql"),
  "utf8",
);
await sql.unsafe(text);
await sql.unsafe("notify pgrst, 'reload schema'");
console.log("00015 applied");
await sql.end();
