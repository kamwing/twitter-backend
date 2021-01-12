import { Pool } from 'pg';

/**
 * Pool object for accessing PostgreSQL.
 */
export const pool = new Pool({
    max: 20,
    idleTimeoutMillis: 30000,
    connectionString: process.env.DB_URL,
});