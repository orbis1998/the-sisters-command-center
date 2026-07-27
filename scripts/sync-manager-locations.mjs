import postgres from "postgres";
import fs from "fs";

const env = fs.readFileSync(".env", "utf8");
const databaseUrl = env
  .split(/\r?\n/)
  .find((line) => line.startsWith("DATABASE_URL="))
  ?.slice("DATABASE_URL=".length);

const sql = postgres(databaseUrl, { ssl: "require", prepare: false });

const updated = await sql.unsafe(`
  UPDATE public.user_roles ur
  SET location_id = pos.id
  FROM public.points_of_sale pos
  WHERE pos.manager_user_id = ur.user_id
    AND ur.role = 'manager'::app_role
  RETURNING ur.id, ur.name, ur.location_id
`);

console.log("UPDATED", updated);

const managers = await sql`select name, badge_code, location_id, city_scope from erp_managers order by name`;
console.log("MANAGERS", managers);

await sql.end();
