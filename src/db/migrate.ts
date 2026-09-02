import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local", quiet: true });
loadEnv({ path: ".env", quiet: true });

async function main() {
  const { migrate } = await import("drizzle-orm/node-postgres/migrator");
  const { db, pool } = await import("./index");

  await migrate(db, { migrationsFolder: "./drizzle" });
  await pool.end();

  console.log("Migrations applied.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
