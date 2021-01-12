import { pool } from '../database/postgres';
import createError from 'http-errors';

export = {
    /**
     * Check if an email address is already associated with another account.
     * @param email An email address.
     */
    isEmailAvailable: async (email: string): Promise<boolean> => {
        const client = await pool.connect();
        const SQL = 'SELECT email FROM public.user WHERE email = LOWER($1);';
        
        const { rows } = await client.query(SQL, [email]);
        client.release();
        
        return rows.length == 0;
    },
    /**
     * Check if a username is already associated with another account.
     * @param username A new username.
     */
    isUsernameAvailable: async (username: string): Promise<boolean> => {
        const client = await pool.connect();
        const SQL = 'SELECT username_lower FROM public.user WHERE username_lower = LOWER($1);';
        
        const { rows } = await client.query(SQL, [username]);
        client.release();
        
        return rows.length == 0;
    },
    /**
     * Creates a new account.
     * @param email An email address.
     * @param username A new username.
     * @param hashedPassword A hashed password.
     * @param profileURL A profile image URL.
     * @param smallProfileURL A small profile image URL.
     * @param backgroundURL A background image URL.
     * @param description The profile's description. 
     */
    register: async (email: string, username: string, hashedPassword: string, profileURL: string, smallProfileURL: string, backgroundURL: string, description: string): Promise<void> => {
        const client = await pool.connect();
        const USER_SQL = 'INSERT INTO public.user values(LOWER($1), $2, LOWER($3), $4, timezone(\'Pacific/Auckland\', now()), $5, $6, $7, $8);';

        await client.query(USER_SQL, [email, username, username, hashedPassword, profileURL, smallProfileURL, backgroundURL, description]);
        client.release();
    },
    /**
     * Get a user's account identifiers.
     * @param email An email address.
     */
    getIdentifiersFromEmail: async (email: string): Promise<{ uid: number, username: string }> => {
        const client = await pool.connect();
        const SQL = 'SELECT uid, username FROM public.user WHERE email = LOWER($1);';

        const { rows } = await client.query(SQL, [email]);
        client.release();

        if (rows.length == 0) throw createError(401, 'Invalid email or password');

        return rows[0];
    },
    /**
     * Gets the hashed password of a user for comparison at login.
     * @param email An email address.
     */
    getHashedPassword: async (email: string): Promise<string> => {
        const client = await pool.connect();
        const SQL = 'SELECT password FROM public.user WHERE email = LOWER($1);';

        const { rows } = await client.query(SQL, [email]);
        client.release();

        if (rows.length == 0) throw createError(401, 'Invalid email or password');

        return rows[0].password;
    }
}