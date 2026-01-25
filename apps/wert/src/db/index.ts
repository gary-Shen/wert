import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from "./schema";
import * as dotenv from "dotenv";

dotenv.config();

// Fix for "VercelPostgresError: missing_connection_string"
// If POSTGRES_URL is missing, fall back to "pg" driver with split params.

let connectionString = process.env.POSTGRES_URL;
let sslConfig: boolean | { rejectUnauthorized: boolean } | undefined = { rejectUnauthorized: false };

if (!connectionString) {
  const host = process.env.DB_HOST || "localhost";
  const port = process.env.DB_PORT || "5432";
  const user = process.env.DB_USER || "postgres";
  const password = process.env.DB_PASSWORD || "";
  const dbName = process.env.DB_NAME || "snapworth";
  
  connectionString = `postgres://${user}:${password}@${host}:${port}/${dbName}`;
  sslConfig = false;
} else {
  // Fix for "Self-signed certificate" errors by forcing no-verify in URL
   connectionString = connectionString.includes('?') 
    ? `${connectionString}&sslmode=no-verify` 
    : `${connectionString}?sslmode=no-verify`;
}

const pool = new Pool({
  connectionString,
  ssl: sslConfig,
});

export const db = drizzle(pool, { schema });
