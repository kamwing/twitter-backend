import { Router } from 'express';
import { check } from 'express-validator';
import TimelineController from '../controllers/TimelineController';

const router = Router();

/**
 * Links a request for searching through all our users posts.
 */
router.get('/', check('keywords').notEmpty().withMessage('Invalid keywords'), TimelineController.getSearchTimeline);

export default router;