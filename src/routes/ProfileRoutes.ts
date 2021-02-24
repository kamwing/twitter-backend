import { Router, Request } from 'express';
import { check } from 'express-validator';
import ProfileController from '../controllers/ProfileController';
import path from 'path';
import multer from 'multer';

/** Allowed image extensions */
const allowedImageExts = [ '.JPG', '.JPEG', '.JFIF', '.PJPEG', '.PJP', '.PNG'];

/**
 * File filter that removes any files that aren't images.
 */
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    cb(null, allowedImageExts.indexOf(path.extname(file.originalname).toUpperCase()) != -1);
}

/** Multer instance with filtering and memory storage for uploads. */
const upload = multer({ storage: multer.memoryStorage(), fileFilter });

const router = Router();

/**
 * links a request for getting a user's profile
 */
router.get('/', check('username').notEmpty().withMessage('Invalid username'), ProfileController.getProfile);

/**
 * Links a request for updating a user's profile.
 */
router.post('/update', upload.fields([
    { name: 'background', maxCount: 1},
    { name: 'profile', maxCount: 1 }
]), ProfileController.update);

/**
 * Links a request for a small version of a user's profile image. 
 */
router.get("/small", ProfileController.getNavProfileImage);

/**
 * Links a request for a user's posts.
 */
router.get('/posts', check('username').notEmpty().withMessage('Invalid username'), ProfileController.getPosts);

/**
 * Links a request for a user's liked posts.
 */
router.get('/likes', check('username').notEmpty().withMessage('Invalid username'), ProfileController.getLikedPosts);

/**
 * Links a request for a user to follow another user.
 */
router.post('/follow', check('username').notEmpty().withMessage('Invalid username'), ProfileController.follow);

/**
 * Links a request for a user to unfollow another user.
 */
router.delete('/follow', check('username').notEmpty().withMessage('Invalid username'), ProfileController.unfollow);

export default router;