import { Router } from 'express';
import TimelineController from '../controllers/TimelineController';

const router = Router();

/**
 * Links a request for a user's home timeline.
 */
router.get('/', TimelineController.getHomeTimeline);

export default router;