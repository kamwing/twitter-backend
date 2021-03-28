import { Router, Request } from 'express';
import UserController from '../controllers/UserController';
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
router.get('/:username', UserController.getProfile);

/**
 * Links a request for updating a user's profile.
 */
router.post('/:username', upload.fields([
    { name: 'background', maxCount: 1},
    { name: 'profile', maxCount: 1 }
]), UserController.update);

/**
 * Links a request for a small version of a user's profile image. 
 */
router.get("/:username/small", UserController.getNavProfileImage);

/**
 * Links a request for a user's posts.
 */
router.get('/:username/posts', UserController.getPosts);

/**
 * Links a request for a user's liked posts.
 */
router.get('/:username/likes', UserController.getLikedPosts);

/**
 * Links a request for a user to follow another user.
 */
router.post('/:username/follow', UserController.follow);

/**
 * Links a request for a user to unfollow another user.
 */
router.delete('/:username/follow', UserController.unfollow);

export default router;