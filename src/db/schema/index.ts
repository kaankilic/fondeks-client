// Every table lives in its own file and is re-exported here.
// `drizzle.config.ts` and `src/db/index.ts` both read from this barrel.

export * from "./auth";
export * from "./funds";
