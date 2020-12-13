import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import AuthModel from '../models/AuthModel';
import JWTManager from '../middleware/JWTManager';

export = {
    login: (req: Request, res: Response): void => {
        AuthModel.getHashedPassword(req.body.email)
        .then((hash) => bcrypt.compare(req.body.password, hash))
        .then((validHash) => {
            if (validHash) {
                return AuthModel.getUID(req.body.email);
            } else {
                throw new Error("Invalid email or password");
            }
        })
        .then((uid) => {
            res.send({ token: JWTManager.generateToken(uid, req.body.email) });
        })
        .catch((err: Error) => {// Server error
            if (err.message === "Invalid email or password" || err.message === "Invalid email") {
                res.sendStatus(401);
            } else {
                res.sendStatus(500);
                console.log(err);
            }
        }); 
    },
    register: (req: Request, res: Response): void => {
        AuthModel.isAvailable(req.body.email)
        .then(() => bcrypt.hash(req.body.password, 10))
        .then((hash) => {
            if (hash == undefined) throw new Error("Invalid password hash");
            return AuthModel.register(req.body.email, req.body.username, hash);
        })
        .then(() => res.sendStatus(200))
        .catch((err: Error) => { // Server error
            if (err.message === "Email already registered") {
                res.status(400).send({
                    error: err.message
                });
            } else {
                res.sendStatus(500);
                console.log(err);
            }
        })
    },
    logout: (req: Request, res: Response): void => {
        res.send("hello world 3");
    }
}