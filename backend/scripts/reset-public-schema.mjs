import pg from "pg";
import "dotenv/config";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL is required");
}

const adminUrl = new URL(url);
adminUrl.pathname = "/postgres";

const dbName = new URL(url).pathname.replace("/", "") || "performx360";
const admin = new pg.Client({ connectionString: adminUrl.toString() });
await admin.connect();

const existing = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [
  dbName,
]);
if (existing.rowCount === 0) {
  await admin.query(`CREATE DATABASE "${dbName}"`);
  console.log(`Created database ${dbName}`);
} else {
  console.log(`Database ${dbName} already exists`);
}
await admin.end();

const db = new pg.Client({ connectionString: url });
await db.connect();
await db.query("DROP SCHEMA IF EXISTS public CASCADE");
await db.query("CREATE SCHEMA public");
await db.query("GRANT ALL ON SCHEMA public TO PUBLIC");
console.log("Reset public schema");
await db.end();
