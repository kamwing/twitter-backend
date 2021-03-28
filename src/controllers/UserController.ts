import { NextFunction, Response } from 'express';
import createError from 'http-errors';
import { validationResult } from 'express-validator';
import sharp from 'sharp';
import path from 'path';
import { AuthRequest } from '../middleware/jwtManager';
import UserCache from '../models/UserCacheModel';
import UserModel from '../models/UserModel';

export = {
    /**
     * Handles core profile data requests. (Profile image, background image, username and description)
     */
    getProfile: async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
        const { username } = req.params;
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return next(createError(400, errors.array()[0].msg));
        }
        
        try {
            const uid = await UserCache.getUIDFromUsername(username as string);
            await UserCache.cacheCheck(uid);
            const profile = await UserCache.getProfile(uid, req.user!.uid);
        
            res.send(profile);
        } catch (err) {
            next(err);
        }
    },
    /**
     * Handles requests for user profile images.
     */
    getNavProfileImage: async (req: AuthRequest, res: Response): Promise<void> => {
        const { username } = req.params;
        const uid = await UserCache.getUIDFromUsername(username as string);
        await UserCache.cacheCheck(uid);
        res.send({
            smallProfileURL: await UserCache.getSmallProfileImage(uid)
        });
    },
    /**
     * Handles requests for user timelines.
     */
    getPosts: async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
        const { username } = req.params;
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return next(createError(400, errors.array()[0].msg));
        }

        try {
            const lastDate = req.query.lastDate ? new Date(req.query.lastDate as string) : undefined;

            const uid = await UserCache.getUIDFromUsername(username as string);
            await UserCache.cacheCheck(uid);
            const posts = await UserCache.getUserTimeline(uid, req.user!.uid, lastDate);
            
            res.send(posts);
        } catch (err) {
            next(err);
        }
    },
    /**
     * Handles requests for like timelines.
     */
    getLikedPosts: async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
        const { username } = req.params;
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return next(createError(400, errors.array()[0].msg));
        }

        try {
            const lastDate = req.query.lastDate ? new Date(req.query.lastDate as string) : undefined;

            const uid = await UserCache.getUIDFromUsername(username as string);
            await UserCache.cacheCheck(uid);
            const posts = await UserCache.getLikeTimeline(uid, req.user!.uid, lastDate);
            
            res.send(posts);
        } catch (err) {
            next(err);
        }
    },
    /**
     * Handles requests for following another user.
     */
    follow: async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
        const { username } = req.params;
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return next(createError(400, errors.array()[0].msg));
        }

        try {
            const uid = await UserCache.getUIDFromUsername(username as string);
            await UserModel.follow(req.user!.uid, uid);
            await UserCache.removeTimelineCache(req.user!.uid);
            res.sendStatus(200);
        } catch (err) {
            next(err);
        }
    },
    /**
     * Handles requests for unfollowing another user.
     */
    unfollow: async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
        const { username } = req.params;
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return next(createError(400, errors.array()[0].msg));
        }
        
        try {
            const uid = await UserCache.getUIDFromUsername(username as string);
            await UserCache.cacheCheck(uid);
            await UserModel.unfollow(req.user!.uid, uid);
            await UserCache.removeTimelineCache(req.user!.uid);

            res.sendStatus(200);
        } catch (err) {
            next(err);
        }
    },
    /**
     * Handles requests for updating a user's profile.
     */
    update: async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
        const { username, description } = req.body;
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };
        const pathPrefix = '../../../public/img/';
        const promises = [] as Promise<any>[];
        
        if (files['profile']) {
            const file = files['profile'][0];
            const smallIMGPath = pathPrefix + req.user!.uid + '-profile-small.png';
            const bigIMGPath = pathPrefix + req.user!.uid + '-profile.png';
            promises.push(sharp(file.buffer)
                .resize(50, 50)
                .png()
                .toFile(path.join(__dirname + smallIMGPath)));
            promises.push(sharp(file.buffer)
                .resize(100, 100)
                .png()
                .toFile(path.join(__dirname + bigIMGPath)));
            promises.push(UserModel.updateProfileIMG(req.user!.uid, req.user!.uid + '-profile-small.png', req.user!.uid + '-profile.png'));
        }

        if (files['background']) {
            const file = files['background'][0];
            const imgPath = pathPrefix + req.user!.uid + '-background.png';
            promises.push(sharp(file.buffer)
                .resize(1024, 200)
                .png()
                .toFile(path.join(__dirname + imgPath)));
            promises.push(UserModel.updateBackgroundIMG(req.user!.uid, req.user!.uid + '-background.png'));
        }

        if (username) promises.push(UserModel.updateUsername(req.user!.uid, username));
        if (description) promises.push(UserModel.updateDescription(req.user!.uid, description));

        Promise.all(promises)
            .then(() => UserCache.refreshProfileCache(req.user!.uid))
            .then(() => {
                if (username) {
                    const maxAge = 1000 * 60 * 60 * 24 * 7;
                    res.cookie('username', username, { maxAge });
                }
                res.sendStatus(200);
            })
            .catch((err) => next(err));
    }
}