import pool from '../database/DBPool';

export = {
    isAvailable: async (email: string): Promise<void> => {
        const client = await pool.connect();
        const SQL = "SELECT email FROM public.user WHERE email = $1;";
        
        const { rows } = await client.query(SQL, [email.toLowerCase()]);
        client.release();
        if (rows.length == 1) throw new Error("Email already registered");
    },
    register: async (email: string, username: string, hashedPassword: string): Promise<void> => {
        const client = await pool.connect();
        const SQL = "INSERT INTO public.user values($1, $2, $3);";

        await client.query(SQL, [email.toLowerCase(), username, hashedPassword]);
        client.release();
    },
    getUID: async (email: string): Promise<number> => {
        const client = await pool.connect();
        const SQL = "SELECT uid FROM public.user WHERE email = $1";

        const { rows } = await client.query(SQL, [email.toLowerCase()]);
        client.release();

        if (rows.length == 0) throw new Error("Invalid email");

        return rows[0].uid;
    },
    getHashedPassword: async(email: string): Promise<string> => {
        const client = await pool.connect();
        const SQL = "SELECT password FROM public.user WHERE email = $1";

        const { rows } = await client.query(SQL, [email.toLowerCase()]);
        client.release();

        if (rows.length == 0) throw new Error("Invalid email");

        return rows[0].password;
    }
}