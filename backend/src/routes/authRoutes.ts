import { Router } from 'express';
import { register, login, logout, getMe } from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { registerSchema, loginSchema } from '../validations';

const router = Router();

router.post('/register', validateRequest({ body: registerSchema }), register);
router.post('/login', validateRequest({ body: loginSchema }), login);
router.post('/logout', logout);
router.get('/me', authenticate, getMe);

export default router;
