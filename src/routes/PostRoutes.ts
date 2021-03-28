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
router.post('/:pid/:uid/comment', check('message').notEmpty().withMessage('Invalid message'), PostController.createCommentPost);

/**
 * Links a request for liking a post.
 */
router.post('/:pid/:uid/like', PostController.likePost);

/**
 * Links a request for unliking a post.
 */
router.delete('/:pid/:uid/like', PostController.unlikePost);

/**
 * Links a request for reposting a post.
 */
router.post('/:pid/:uid/repost', PostController.repost);

/**
 * Links a request for unreposting a post.
 */
router.delete('/:pid/:uid/repost', PostController.unrepost);

/**
 * Links a request for viewing a post and its comments.
 */
router.get('/:pid/:username', PostController.viewPost);

export default router;