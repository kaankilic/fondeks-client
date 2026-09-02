import { config as loadEnv } from "dotenv";
import { defineConfig } from "drizzle-kit";

import { withLibpqSsl } from "./src/db/ssl";

// Next.js reads .env.local automatically; drizzle-kit needs it loaded explicitly.
loadEnv({ path: ".env.local", quiet: true });
loadEnv({ path: ".env", quiet: true });

const url = process.env.DATABASE_URL;

if (!url) {
  throw new Error("DATABASE_URL is not set. Add it to .env.local.");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  dbCredentials: { url: withLibpqSsl(url) },
  casing: "snake_case",
  verbose: true,
  strict: true,
});
