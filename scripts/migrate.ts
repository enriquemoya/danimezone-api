import fs from "fs";
import path from "path";
import { Client } from "pg";
import dotenv from "dotenv";

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required.");
}

const migrationsDir = path.join(__dirname, "..", "migrations");
const migrationFiles = fs
  .readdirSync(migrationsDir)
  .filter((file) => file.endsWith(".sql"))
  .sort();

async function run() {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    for (const file of migrationFiles) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
      await client.query(sql);
    }
    console.log("migrate: ok");
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error("migrate: failed", error instanceof Error ? error.message : error);
  process.exit(1);
});
