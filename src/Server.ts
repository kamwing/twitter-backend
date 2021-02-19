import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import http from 'http';
import { authCheck } from './middleware/jwtManager';
import Batch from './utils/Batch';
import errorHandler from './middleware/errorHandler';

import AuthRoutes from './routes/AuthRoutes';
import ProfileRoutes from './routes/ProfileRoutes';
import PostRoutes from './routes/PostRoutes';
import TimelineRoutes from './routes/TimelineRoutes';
import SearchRoutes from './routes/SearchRoutes';

const maxImageCacheAge = 604800000;

/**
 * Class representing the HTTP web server.
 * Configures express, routes and starts batch processing.
 */
export default class Server {
    /** Express server object. */
    private app: express.Application;
    /** HTTP server object. */
    private server: http.Server | null;

    /** Calls helper functions to configure express. */
    constructor() {
        this.app = express();
        this.config();
        this.routes();
        this.batchProcessing();
        this.server = null;

        // Error handler must be the last middleware added to express
        this.app.use(errorHandler);
    }

    /** Get the express server object. */
    public getApp(): express.Application {
        return this.app;
    }

    /** 
     * Configures cookie and query parsing. 
     */
    private config() {
        this.app.use(express.json());
        this.app.use(cookieParser());
        
        this.app.all('/*', (req, res, next) => {
            res.header('Access-Control-Allow-Origin', 'http://localhost:3001'); // host of web server for react site
            res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
            res.header('Access-Control-Allow-Methods: GET, POST, PATCH, PUT, DELETE, OPTIONS');
            res.header('Access-Control-Allow-Credentials', 'true');
            next();
        });
    }

    /**
     * Attempts to process a new batch of posts/users a few times a second.
     */
    private batchProcessing() {
        setTimeout(() => {
            const batch = new Batch(100);
            batch.exec()
            .catch((err: Error) => {
                console.log('Failed to fetch next batch.');
                console.log(err);
            })
            .finally(() => this.batchProcessing());
        }, 50);
    }

    /**
     * Configures image directory and connects the routes from each module.
     */
    private routes() {
        this.app.use('/api/img', express.static(path.join(__dirname, '../public/img'), {
            maxAge: maxImageCacheAge
        }));
        this.app.use('/api/auth', AuthRoutes);
        this.app.use('/api/profile', authCheck, ProfileRoutes);
        this.app.use('/api/post', authCheck, PostRoutes);
        this.app.use('/api/timeline', authCheck, TimelineRoutes);
        this.app.use('/api/search', authCheck, SearchRoutes);
    }

    /**
     * Starts the HTTP server.
     * @param port The HTTP port number.
     */
    public start = (port: number): Promise<number> => new Promise((resolve, reject) => {
        this.server = this.app.listen(port, () => resolve(port)).on('error', (err: Error) => reject(err))
    });

    /**
     * Closes the HTTP server.
     */
    public close = () => {
        this.server!.close();
    }
}