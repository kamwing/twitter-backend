import request, { Response } from 'supertest';
import Server from '../src/index';
import jwt from 'jsonwebtoken';
import { assert } from 'chai';
import { createRandomAccount,  destroyAccount, flushRedis, IAccount } from './util';

describe('Posts', function() {
    let account: IAccount | null = null;
    let uid: number | null = null;
    const date = new Date().toISOString();

    describe('Setup', () => {
        it('Create account', (done: Mocha.Done) => {
            createRandomAccount((res: IAccount) => {
                account = res;
                uid = (jwt.decode(account!.jwtToken) as any).uid;
                done();
            });
        }).timeout(Infinity);
    });

    describe('POST /api/post/create', () => {
        it('Invalid JWT token', async () => {
            await request(Server.getApp())
                .post("/api/post/create")
                .send({})
                .expect(401);
        });
        it('Invalid parameters', async () => {
            await request(Server.getApp())
                .post("/api/post/create")
                .set('Authorization', 'Bearer ' + account?.jwtToken)
                .send({})
                .expect(400);
        });
        it('Created a post', async () => {
            await request(Server.getApp())
                .post("/api/post/create")
                .set('Authorization', 'Bearer ' + account?.jwtToken)
                .send({ message: "Hello world" })
                .expect(200);
        });
    });

    describe('POST /api/post/create/comment', () => {
        it('Created a comment', async () => {
            await request(Server.getApp())
                .post("/api/post/create/comment")
                .set('Authorization', 'Bearer ' + account?.jwtToken)
                .send({ message: "an amazing comment", pid: 1, uid })
                .expect(200);
        });
    });

    describe('POST /api/post/like', () => {
        it('Invalid parameters', async () => {
            await request(Server.getApp())
                .post("/api/post/like")
                .set('Authorization', 'Bearer ' + account?.jwtToken)
                .expect(400);
        });

        it('Like a post', async () => {
            await request(Server.getApp())
                .post("/api/post/like")
                .set('Authorization', 'Bearer ' + account?.jwtToken)
                .send({ pid: 1, uid })
                .expect(200);
        });
    });
    
    describe('DELETE /api/post/like', () => {
        it('Invalid parameters', async () => {
            await request(Server.getApp())
                .delete("/api/post/like")
                .set('Authorization', 'Bearer ' + account?.jwtToken)
                .expect(400);
        });

        it('Unlike a post', async () => {
            await request(Server.getApp())
                .delete("/api/post/like")
                .set('Authorization', 'Bearer ' + account?.jwtToken)
                .send({ pid: 1, uid })
                .expect(200);
        });
    });

    describe('POST /api/post/repost', () => {
        it('Invalid parameters', async () => {
            await request(Server.getApp())
                .post("/api/post/repost")
                .set('Authorization', 'Bearer ' + account?.jwtToken)
                .expect(400);
        });

        it('Repost a post', async () => {
            await request(Server.getApp())
                .post("/api/post/repost")
                .set('Authorization', 'Bearer ' + account?.jwtToken)
                .send({ pid: 1, uid })
                .expect(200);
        });
    });
    
    describe('DELETE /api/post/repost', () => {
        it('Invalid parameters', async () => {
            await request(Server.getApp())
                .delete("/api/post/repost")
                .set('Authorization', 'Bearer ' + account?.jwtToken)
                .expect(400);
        });

        it('Unrepost a post', async () => {
            await request(Server.getApp())
                .delete("/api/post/repost")
                .set('Authorization', 'Bearer ' + account?.jwtToken)
                .send({ pid: 1, uid })
                .expect(200);
        });
    });

    describe('GET /api/post', () => {
        it('Invalid parameters', async () => {
            await request(Server.getApp())
                .get("/api/post")
                .set('Authorization', 'Bearer ' + account?.jwtToken)
                .query({ pid: 42 })
                .expect(400);
        });

        it('Get post & comment data', (done: Mocha.Done) => {
            request(Server.getApp())
                .get("/api/post")
                .set('Authorization', 'Bearer ' + account?.jwtToken)
                .query({ pid: 1, username: account?.username, lastDate: date })
                .expect(200, (err: Error, res: Response) => {
                    if (err) throw err;
                    assert.equal(res.body.op.message, "Hello world");
                    assert.equal(res.body.comments[0].message, "an amazing comment");
                    done();
                });
        });
    });

    describe('Clean up', () => {
        it('Destroy account', async () => {
            await flushRedis();
            await destroyAccount(account!);
        });
    })
});