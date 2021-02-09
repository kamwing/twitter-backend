import { Request } from 'express';
import jsonwebtoken from 'jsonwebtoken';
import jwt from 'express-jwt';

const secret = process.env.JWT_SECRET as string;
const audience = process.env.JWT_AUDIENCE as string;
const issuer = process.env.JWT_ISSUER as string;

/**
 * Generate a new JWT token.
 * @param uid User ID.
 */
const generateToken = (uid: number): string => {
    return jsonwebtoken.sign({ uid: uid }, secret, { audience, issuer, expiresIn: '1w' });
}

/**
 * Middleware for jwt checking.
 */
const authCheck = jwt({ 
    secret, 
    audience, 
    issuer, 
    algorithms: ['HS256'],
});

/**
 * Represents the contents of a jwt token.
 */
interface JWTToken {
    uid: number;
    iat: number;
    exp: number;
    aud: string;
    iss: string;
}

interface AuthRequest extends Request {
    user?: JWTToken;
}

export { generateToken, authCheck, AuthRequest };