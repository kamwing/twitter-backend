import jsonwebtoken from 'jsonwebtoken';
import jwt from 'express-jwt';

const secret = process.env.JWT_SECRET as string;
const audience = process.env.JWT_AUDIENCE as string;
const issuer = process.env.JWT_ISSUER as string;

export = {
    generateToken: (uid: number, email: string): string => {
        return jsonwebtoken.sign({ uid: uid, email: email }, secret, { audience, issuer, expiresIn: '7d' });
    },
    authRequest: jwt({ secret, audience, issuer, algorithms: ['HS256'] })
}