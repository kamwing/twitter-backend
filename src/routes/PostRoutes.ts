import { Router } from 'express';
import { check } from 'express-validator';
import PostController from '../controllers/PostController';

const router = Router();

/**
 * Links a request for creating a post.
 */
router.post('/', check('message').notEmpty().withMessage('Invalid message'), PostController.createPost);

/**
 * Links a request for creating a comment on a post.
 */
router.post('/comment', check('message').notEmpty().withMessage('Invalid message'),  check(['pid', 'uid']).exists().isNumeric().withMessage('Invalid post ID'), PostController.createCommentPost);

/**
 * Links a request for liking a post.
 */
router.post('/like', check(['pid', 'uid']).exists().isNumeric().withMessage('Invalid post ID'), PostController.likePost);

/**
 * Links a request for unliking a post.
 */
router.delete('/like', check(['pid', 'uid']).exists().isNumeric().withMessage('Invalid post ID'), PostController.unlikePost);

/**
 * Links a request for reposting a post.
 */
router.post('/repost', check(['pid', 'uid']).exists().isNumeric().withMessage('Invalid post ID'), PostController.repost);

/**
 * Links a request for unreposting a post.
 */
router.delete('/repost', check(['pid', 'uid']).exists().isNumeric().withMessage('Invalid post ID'), PostController.unrepost);

/**
 * Links a request for viewing a post and its comments.
 */
router.get('/', check('pid').isNumeric().withMessage('Invalid post ID'), check('username').notEmpty().withMessage('Invalid username'), PostController.viewPost);

export default router;