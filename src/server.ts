import express from 'express';
// import bodyParser from 'body-parser';
import pool from './database/DBPool';
import JWTManager from './middleware/JWTManager';

import AuthRoutes from './routes/AuthRoutes';
import ProfileRoutes from './routes/ProfileRoutes';

export default class Server {
    private app: express.Application;

    constructor() {
        this.app = express();
        this.config();
        this.dbSetup();
        this.routes();
    }

    private config() {
        this.app.use(express.json());
    }

    private dbSetup() {
        pool.connect((err) => {
            if (err) throw err;
            console.log("Connected to db");
        });
    }

    private routes() {
        this.app.use("/api/auth", AuthRoutes);
        this.app.use("/api/profile", JWTManager.authRequest, ProfileRoutes);
    }

    public start = (port: number): Promise<number> => new Promise((resolve, reject) => {
        this.app.listen(port, () => resolve(port)).on('error', (err: Error) => reject(err));
    });
}