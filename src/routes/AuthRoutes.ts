import { Router } from 'express';
import AuthController from '../controllers/AuthController';
import JWTManager from '../middleware/JWTManager';
const router = Router();

router.post("/login", AuthController.login);

router.post("/register", AuthController.register);

router.get("/logout", JWTManager.authRequest, AuthController.logout);

export default router;