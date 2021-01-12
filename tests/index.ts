import { server, userJohn, userBob } from './common';
import pool from './database/postgres';
import redis from './database/redis';
import request from 'supertest';

describe("Twitter Clone", () => {

    describe("Clear test data", () => {
        it("Destroy test accounts", async () => {
            const client = await pool.connect();
            const SQL = `delete from public.user where username in ($1, $2);`;
            await client.query(SQL, [userJohn.username, userBob.username]);
            client.release();
            await redis.flushdb();
        });
        it("Flush Redis", async () => {
            await redis.flushdb();
        });
    });
    
    describe("Setup test accounts", () => {
        describe("POST /api/auth/register", () => {
            it("Create John's account", (done) => {
                request(server!.getApp())
                    .post("/api/auth/register")
                    .send({ username: userJohn.username, email: userJohn.email, password: userJohn.password })
                    .expect(200, done);
            });
            it("Create Bob's account", (done) => {
                request(server!.getApp())
                    .post("/api/auth/register")
                    .send({ username: userBob.username, email: userBob.email, password: userBob.password })
                    .expect(200, done);
            });
        });
        describe("POST /api/auth/login", () => {
            it("Login with John's details", (done) => {
                request(server!.getApp())
                    .post("/api/auth/login")
                    .send({ email: userJohn.email, password: userJohn.password })
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            console.log(err);
                            return done(err);
                        }
                        const rawCookie = String(res.header["set-cookie"][0]);
                        const jwtToken = rawCookie.split(";")[0].split("jwtToken=")[1];
                        userJohn.jwtToken = jwtToken;
                        return done();
                    });
            }).timeout(8000);
            it("Login with Bob's details", (done) => {
                request(server!.getApp())
                    .post("/api/auth/login")
                    .send({ email: userBob.email, password: userBob.password })
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            console.log(err);
                            return done(err);
                        }
                        const rawCookie = String(res.header["set-cookie"][0]);
                        const jwtToken = rawCookie.split(";")[0].split("jwtToken=")[1];
                        userBob.jwtToken = jwtToken;
                        return done();
                    });
            }).timeout(8000);
        });
    });
    
    describe("a", () => require("./wooh/first.test.ts"));
    
    describe("Clear test data", () => {
        it("Destroy test accounts", async () => {
            const client = await pool.connect();
            const SQL = `delete from public.user where username in ($1, $2);`;
            await client.query(SQL, [userJohn.username, userBob.username]);
            client.release();
            await redis.flushdb();
        });
        it("Flush Redis", async () => {
            await redis.flushdb();
        });
        server.close();
    });
});