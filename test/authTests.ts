import request from 'supertest';
import Server from '../src/index';
import { createRandomAccount,  destroyAccount, flushRedis, IAccount } from './util';

describe('Authentication', function() {
    let account: IAccount | null = null;

    describe('Setup', () => {
        it('Create account', (done: Mocha.Done) => {
            createRandomAccount((res: IAccount) => {
                account = res;
                done();
            });
        }).timeout(Infinity);
    });

    describe('POST /api/auth/register', () => {
        it('Invalid parameters', async () => {
            await request(Server.getApp())
                .post("/api/auth/register")
                .send({ email: "admin-4827321432@google.com", username: "wowo47728df" })
                .expect(400);
        });
        it('Email already in use', async () => {
            await request(Server.getApp())
                .post("/api/auth/register")
                .send({ email: account!.email, username: "327ujdsfnq", password: "12345678910" })
                .expect(409);
        });
        it('Username taken', async () => {
            await request(Server.getApp())
                .post("/api/auth/register")
                .send({ email: "2387234hasd@8jhadfh.com", username: account!.username, password: "12345678910" })
                .expect(409);
        });
    });

    describe('POST /api/auth/login', () => {
        it('Invalid parameters', async () => {
            await request(Server.getApp())
                .post("/api/auth/login")
                .send({ email: "admin-4827321432@google.com", notAVALIDfield: "123asd" })
                .expect(400);
        });
        it('Invalid email or password', async () => {
            await request(Server.getApp())
                .post("/api/auth/login")
                .send({ email: account!.email, password: "wrongpassword123" })
                .expect(401);
        });
    });

    describe('Clean up', () => {
        it('Destroy account', async () => {
            await flushRedis();
            await destroyAccount(account!);
        });
    })
});