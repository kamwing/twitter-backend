import { Response } from 'express';
import { validationResult } from 'express-validator';
import createError from 'http-errors';
import { AuthRequest } from '../middleware/jwtManager';
import UserCacheModel from '../models/UserCacheModel';

export = {
    /**
     * Handles home timeline requests.
     * Does a cacheCheck on user and fetches timeline from cache. 
     */
    getHomeTimeline: async (req: AuthRequest, res: Response): Promise<void> => {
        const lastDate = req.query.lastDate ? new Date(req.query.lastDate as string) : undefined;
        await UserCacheModel.cacheCheck(req.user!.uid);
        const posts = await UserCacheModel.getHomeTimeline(req.user!.uid, lastDate);
        
        res.send(posts);
    },
    /**
     * Handles search timeline requests.
     * Does a cacheCheck on user and fetches timeline from PostgreSQL via full-text search. 
     */
    getSearchTimeline: async (req: AuthRequest, res: Response): Promise<void> => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw createError(400, errors.array()[0].msg);
        }

        const lastDate = req.query.lastDate ? new Date(req.query.lastDate as string) : undefined;
        await UserCacheModel.cacheCheck(req.user!.uid);
        const posts = await UserCacheModel.getSearchTimeline(req.query.keywords as string, req.user!.uid, lastDate);
        
        res.send(posts);
    }
}