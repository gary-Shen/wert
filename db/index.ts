import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from "./schema";
import * as dotenv from "dotenv";

dotenv.config();

// Fix for "VercelPostgresError: missing_connection_string"
// If POSTGRES_URL is missing, fall back to "pg" driver with split params.

let connectionString = process.env.POSTGRES_URL;

if (!connectionString) {
  const host = process.env.DB_HOST || "localhost";
  const port = process.env.DB_PORT || "5432";
  const user = process.env.DB_USER || "postgres";
  const password = process.env.DB_PASSWORD || "";
  const dbName = process.env.DB_NAME || "snapworth";
  
  connectionString = `postgres://${user}:${password}@${host}:${port}/${dbName}`;
}

const pool = new Pool({
  connectionString,
});

export const db = drizzle(pool, { schema });
