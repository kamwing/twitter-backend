import { Request, Response, NextFunction} from 'express';
import { HttpError } from 'http-errors';

/** Error handler middleware for http-error, errors. */
export default (err: HttpError, req: Request, res: Response, next: NextFunction): void => {    
    if (err.status) {
        res.status(err.status).json({ error: err.message });
    } else {
        next(err);
    }
}