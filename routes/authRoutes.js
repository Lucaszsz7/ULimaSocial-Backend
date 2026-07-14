// routes/authRoutes.js - Definición de rutas de autenticación
import { Router } from 'express';
import {
  register,
  verifyEmail,
  resendCode,
  login,
  forgotPassword,
  resetPasswordHandler,
  me,
} from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';
import { createRateLimiter } from '../middleware/rateLimit.js';

const router = Router();
const authLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 20 });

// ============================================================
// RUTAS DE AUTENTICACIÓN
// ============================================================

// Registro de nuevo usuario
router.post('/register', authLimiter, register);

// Verificación de correo con código
router.post('/verify', authLimiter, verifyEmail);

// Reenviar código de verificación
router.post('/resend-code', authLimiter, resendCode);

// Inicio de sesión
router.post('/login', authLimiter, login);

// Solicitar recuperación de contraseña
router.post('/forgot-password', authLimiter, forgotPassword);

// Restablecer contraseña con código
router.post('/reset-password', authLimiter, resetPasswordHandler);

router.get('/me', requireAuth, me);

export default router;
