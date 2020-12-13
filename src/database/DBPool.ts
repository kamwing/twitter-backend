import { Pool } from 'pg';

export default new Pool({
    max: 20,
    idleTimeoutMillis: 30000,
    connectionString: process.env.DB_URL
});