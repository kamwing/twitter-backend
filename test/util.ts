import Server from '../src/index';
import { pool } from '../src/database/postgres';
import redis from '../src/database/redis';
import request, { Response } from 'supertest';

export interface IAccount {
    username: string;
    email: string;
    password: string;
    jwtToken: string;
}

const genRandIntString = (length: number): string => {
    let res = "";
    for (let i = 0; i < length; i++) {
        res += String(Math.floor(Math.random() * (9 - 0 + 1) + 0));
    }
    return res;
}

/**
 * Creates a random account and gets a valid JWT token.
 * 
 * @param callback Callback for passing the account auth details.
 */
const createRandomAccount = (callback: (account: IAccount) => void): void => {
    // Username, email prefix and password is between 8-16 characters
    const account = {
        username: genRandIntString(10,),
        email: genRandIntString(10) + "@example.com",
        password: genRandIntString(10),
        jwtToken: ""
    }
    request(Server.getApp())
        .post("/api/auth/register")
        .send({ 
            username: account.username,
            email: account.email,
            password: account.password
        })
        .expect(200, (err, res) => {
            request(Server.getApp())
            .post("/api/auth/login")
            .send({
                email: account.email,
                password: account.password
            })
            .end((err: Error, res: Response) => {
                if (err) throw err;
                const rawCookie = String(res.header["set-cookie"][0]);
                account.jwtToken = rawCookie.split(";")[0].split("jwtToken=")[1];
                return callback(account);
            });
        });
}

/**
 * Removes an account from the PostgreSQL database.
 * 
 * @param callback Called when the account is destroyed.
 */
const destroyAccount = async (account: IAccount): Promise<void> => {
    const client = await pool.connect();
    const SQL = 'DELETE FROM public.user WHERE public.user.username = $1;';

    await client.query(SQL, [account.username]);
    client.release();
}

/**
 * Flush local Redis cache.
 */
const flushRedis = async (): Promise<void> => {
    await redis.flushdb();
}

export { createRandomAccount, destroyAccount, flushRedis,  }