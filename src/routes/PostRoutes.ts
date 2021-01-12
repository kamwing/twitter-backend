import { Router } from 'express';
import { check } from 'express-validator';
import PostController from '../controllers/PostController';

const router = Router();

/**
 * Links a request for creating a post.
 */
router.get('/create', check('message').notEmpty().withMessage('Invalid message'), PostController.createPost);

/**
 * Links a request for creating a comment on a post.
 */
router.get('/create/comment', check('message').notEmpty().withMessage('Invalid message'),  check(['pid', 'uid']).isNumeric().withMessage('Invalid post ID'), PostController.createCommentPost);

/**
 * Links a request for liking a post.
 */
router.get('/like', check(['pid', 'uid']).isNumeric().withMessage('Invalid post ID'), PostController.likePost);

/**
 * Links a request for unliking a post.
 */
router.get('/unlike', check(['pid', 'uid']).isNumeric().withMessage('Invalid post ID'), PostController.unlikePost);

/**
 * Links a request for reposting a post.
 */
router.get('/repost', check(['pid', 'uid']).isNumeric().withMessage('Invalid post ID'), PostController.repost);

/**
 * Links a request for unreposting a post.
 */
router.get('/unrepost', check(['pid', 'uid']).isNumeric().withMessage('Invalid post ID'), PostController.unrepost);

/**
 * Links a request for viewing a post and its comments.
 */
router.get('/', check('pid').isNumeric().withMessage('Invalid post ID'), check('username').notEmpty().withMessage('Invalid username'), PostController.viewPost);

export default router;