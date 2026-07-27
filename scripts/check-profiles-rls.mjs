import postgres from "postgres";
import fs from "fs";

const env = fs.readFileSync(".env", "utf8");
const databaseUrl = env
  .split(/\r?\n/)
  .find((line) => line.startsWith("DATABASE_URL="))
  ?.slice("DATABASE_URL=".length);

const sql = postgres(databaseUrl, { ssl: "require", prepare: false });

const policies = await sql`
  select tablename, policyname, cmd, roles::text, qual
  from pg_policies
  where schemaname='public' and tablename in ('profiles', 'erp_products', 'user_roles')
  order by tablename, policyname
`;
console.log(JSON.stringify(policies, null, 2));

await sql.end();
