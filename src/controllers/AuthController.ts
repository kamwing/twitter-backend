import { NextFunction, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import AuthModel from '../models/AuthModel';
import { validationResult } from 'express-validator';
import createError from 'http-errors';
import UserCache from '../models/UserCacheModel';
import { generateToken } from '../middleware/jwtManager';

const defaultBackgroundURL = 'default-background.png';
const defaultSmallProfileURL = 'default-profile-small.png';
const defaultProfileURL = 'default-profile.png';
const defaultBio = 'Hello, I am new to Twitter.';

export = {
    /**
     * Processes a login request, gets hashed password from given email
     * and compares the correct hash with the given password. If successfull,
     * it generates a jwt token and feeds it into a cookie.
     */
    login: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            next(createError(400, errors.array()[0].msg));
        }

        try {
            const hash = await AuthModel.getHashedPassword(req.body.email);
            const validHash = await bcrypt.compare(req.body.password, hash);
            
            if (!validHash) {
                return next(createError(401, 'Invalid email or password'));
            }

            const { uid, username } = await AuthModel.getIdentifiersFromEmail(req.body.email);
            const maxAge = 1000 * 60 * 60 * 24 * 7;
            
            res.cookie('jwtToken', generateToken(uid), { maxAge });
            res.cookie('username', username, { maxAge });
            
            await UserCache.cacheCheck(uid);

            res.sendStatus(200);
        } catch (e) {
            return next(createError(401, 'Invalid email or password'));
        }
    },
    /**
     * Processes a register request, by checking if the email and username 
     * is available first. Then creating a hash from the given password and 
     * finally making a request to PostgreSQL.
     */
    register: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return next(createError(400, errors.array()[0].msg));
        }

        const emailAvailable = await AuthModel.isEmailAvailable(req.body.email);
        if (!emailAvailable) {
            return next(createError(409, 'Email already registered'));
        }
        const usernameAvailable = await AuthModel.isUsernameAvailable((req.body.username as string).trim());
        if (!usernameAvailable) {
            return next(createError(409, 'Username already taken'));
        }

        const hash = await bcrypt.hash(req.body.password, 10);

        await AuthModel.register((req.body.email as string).trim(), (req.body.username as string).trim(), hash, defaultProfileURL, defaultSmallProfileURL, defaultBackgroundURL, defaultBio);

        res.sendStatus(200);
    }
}