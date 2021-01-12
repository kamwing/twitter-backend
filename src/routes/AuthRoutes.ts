import { Router } from 'express';
import { check } from 'express-validator';
import AuthController from '../controllers/AuthController';

const router = Router();

/**
 * Links a request for logging in and generating a JWT token.
 */
router.post('/login', check('email').isEmail().withMessage('Invalid email address'), check('password').isLength({ min: 6 }).withMessage('Invalid password'), AuthController.login);

/**
 * Links a request for creating a new account.
 */
router.post('/register', check('email').isEmail().withMessage('Invalid email address'), check('username').isAlphanumeric().withMessage('Invalid username'), check('password').isLength({ min: 6 }).withMessage('Invalid password'), AuthController.register);

export default router;