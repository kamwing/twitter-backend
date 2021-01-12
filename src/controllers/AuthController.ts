import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import AuthModel from '../models/AuthModel';
import { validationResult } from 'express-validator';
import createError from 'http-errors';
import UserCache from '../models/UserCacheModel';
import { generateToken } from '../middleware/jwtManager';

const defaultBackgroundURL = 'https://picsum.photos/1024/200';
const defaultSmallProfileURL = 'https://picsum.photos/50/50';
const defaultProfileURL = 'https://picsum.photos/100/100';
const defaultBio = 'Hello, I am new to Twitter.';

export = {
    /**
     * Processes a login request, gets hashed password from given email
     * and compares the correct hash with the given password. If successfull,
     * it generates a jwt token and feeds it into a cookie.
     */
    login: async (req: Request, res: Response): Promise<void> => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw createError(400, errors.array()[0].msg);
        }

        const hash = await AuthModel.getHashedPassword(req.body.email);
        const validHash = await bcrypt.compare(req.body.password, hash);
        
        if (!validHash) {
            throw createError(401, 'Invalid email or password');
        }

        const { uid, username } = await AuthModel.getIdentifiersFromEmail(req.body.email);
        const maxAge = 1000 * 60 * 60 * 24 * 7;
        
        res.cookie('jwtToken', generateToken(uid), { maxAge });
        res.cookie('username', username, { maxAge });
        
        await UserCache.cacheCheck(uid);

        res.sendStatus(200);
    },
    /**
     * Processes a register request, by checking if the email and username 
     * is available first. Then creating a hash from the given password and 
     * finally making a request to PostgreSQL.
     */
    register: async (req: Request, res: Response): Promise<void> => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw createError(400, errors.array());
        }

        const emailAvailable = await AuthModel.isEmailAvailable(req.body.email);
        if (!emailAvailable) {
            throw createError(409, 'Email already registered');
        }
        const usernameAvailable = await AuthModel.isUsernameAvailable(req.body.username);
        if (!usernameAvailable) {
            throw createError(409, 'Username already taken');
        }

        const hash = await bcrypt.hash(req.body.password, 10);

        await AuthModel.register(req.body.email, req.body.username, hash, defaultProfileURL, defaultSmallProfileURL, defaultBackgroundURL, defaultBio);

        res.sendStatus(200);
    }
}