import request, { Response } from 'supertest';
import Server from '../src/index';
import jwt from 'jsonwebtoken';
import { assert } from 'chai';
import { createRandomAccount,  destroyAccount, flushRedis, IAccount } from './util';

describe('Profile', function() {
    let account: IAccount | null = null;
    let accountB: IAccount | null = null;
    let uid: number | null = null;

    describe('Setup', () => {
        it('Create account', (done: Mocha.Done) => {
            createRandomAccount((res: IAccount) => {
                account = res;
                uid = (jwt.decode(account!.jwtToken) as any).uid;
                done();
            });
        }).timeout(Infinity);
        it('Create another account', (done: Mocha.Done) => {
            createRandomAccount((res: IAccount) => {
                accountB = res;
                done();
            });
        }).timeout(Infinity);
        it('Create a post', async () => {
            await request(Server.getApp())
                .post("/api/post/create")
                .set('Authorization', 'Bearer ' + account?.jwtToken)
                .send({ message: "an amazing post" })
                .expect(200);
        });
        it('Like a post', async () => {
            await request(Server.getApp())
                .post("/api/post/like")
                .set('Authorization', 'Bearer ' + account?.jwtToken)
                .send({ pid: 1, uid })
                .expect(200);
        });
    });

    describe('GET /api/profile', () => {
        it('Invalid parameters', async () => {
            await request(Server.getApp())
                .get("/api/profile")
                .set('Authorization', 'Bearer ' + account?.jwtToken)
                .query({})
                .expect(400);
        });

        it('Get profile', (done: Mocha.Done) => {
            request(Server.getApp())
                .get("/api/profile")
                .set('Authorization', 'Bearer ' + account?.jwtToken)
                .query({ username: account?.username })
                .expect(200, (err: Error, res: Response) => {
                    if (err) throw err;
                    assert.equal(res.body.username, account?.username);
                    done();
                });
        });
    });

    describe('GET /api/profile/posts', () => {
        it('Invalid parameters', async () => {
            await request(Server.getApp())
                .get("/api/profile/posts")
                .set('Authorization', 'Bearer ' + account?.jwtToken)
                .query({})
                .expect(400);
        });

        it('Get profile posts', (done: Mocha.Done) => {
            request(Server.getApp())
                .get("/api/profile/posts")
                .set('Authorization', 'Bearer ' + account?.jwtToken)
                .query({ username: account?.username })
                .expect(200, (err: Error, res: Response) => {
                    if (err) throw err;
                    assert.equal(res.body[0].message, "an amazing post");
                    done();
                });
        });
    });

    describe('GET /api/profile/likes', () => {
        it('Invalid parameters', async () => {
            await request(Server.getApp())
                .get("/api/profile/likes")
                .set('Authorization', 'Bearer ' + account?.jwtToken)
                .query({})
                .expect(400);
        });

        it('Get profile likes', (done: Mocha.Done) => {
            request(Server.getApp())
                .get("/api/profile/likes")
                .set('Authorization', 'Bearer ' + account?.jwtToken)
                .query({ username: account?.username })
                .expect(200, (err: Error, res: Response) => {
                    if (err) throw err;
                    assert.equal(res.body[0].message, "an amazing post");
                    done();
                });
        });
    });

    describe('POST /api/profile/follow', () => {
        it('Invalid parameters', async () => {
            await request(Server.getApp())
                .post("/api/profile/follow")
                .set('Authorization', 'Bearer ' + account?.jwtToken)
                .send({})
                .expect(400);
        });

        it('Follow a user', async () => {
            await request(Server.getApp())
                .post("/api/profile/follow")
                .set('Authorization', 'Bearer ' + account?.jwtToken)
                .send({ username: accountB?.username })
                .expect(200);
        });
        it('Unfollow a user', async () => {
            await request(Server.getApp())
                .delete("/api/profile/follow")
                .set('Authorization', 'Bearer ' + account?.jwtToken)
                .send({ username: accountB?.username })
                .expect(200);
        });
    });

    describe('GET /api/profile/small', () => {
        it('Get small profile image', (done: Mocha.Done) => {
            request(Server.getApp())
                .get("/api/profile/small")
                .set('Authorization', 'Bearer ' + account?.jwtToken)
                .query({ username: account?.username })
                .expect(200, (err: Error, res: Response) => {
                    if (err) throw err;
                    assert.equal(res.body.smallProfileURL, "https://social.gabe.nz/api/img/default-profile-small.png");
                    done();
                });
        });
    });

    describe('Clean up', () => {
        it('Destroy accounts', async () => {
            await flushRedis();
            await destroyAccount(accountB!);
            await destroyAccount(account!);
        });
    })
});