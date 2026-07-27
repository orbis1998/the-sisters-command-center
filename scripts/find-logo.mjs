import fs from "fs";
import postgres from "postgres";

const env = fs.readFileSync(".env", "utf8");
const databaseUrl = env.split(/\r?\n/).find((l) => l.startsWith("DATABASE_URL="))?.slice("DATABASE_URL=".length);
const sql = postgres(databaseUrl, { ssl: "require", prepare: false });

const rows = await sql`
  SELECT name, bucket_id FROM storage.objects
  WHERE bucket_id IN ('site-assets', 'product-images')
  AND (name ILIKE '%logo%' OR name ILIKE '%brand%' OR name ILIKE '%sisters%')
  ORDER BY created_at DESC
  LIMIT 30
`;
console.log(JSON.stringify(rows, null, 2));
await sql.end();
