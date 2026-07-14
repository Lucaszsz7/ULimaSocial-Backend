// server.js - Punto de entrada del servidor Express
import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { query } from './db.js';

// Importar rutas
import authRoutes from './routes/authRoutes.js';
import friendsRoutes from './routes/friendsRoutes.js';
import groupsRoutes from './routes/groupsRoutes.js';
import messagesRoutes from './routes/messagesRoutes.js';
import postsRoutes from './routes/postsRoutes.js';
import usersRoutes from './routes/usersRoutes.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

// Inicializar Express
const app = express();
const PORT = process.env.PORT || 3000;
app.set('trust proxy', 1);

// ============================================================
// MIDDLEWARES GLOBALES
// ============================================================

// CORS: permitir peticiones desde el frontend (Vite en puerto 5173)
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',').map((origin) => origin.trim());
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

// Parsear JSON en el body de las peticiones
app.use(express.json({ limit: '10mb' }));

// Parsear URL-encoded data
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('X-Frame-Options', 'DENY');
  res.set('Referrer-Policy', 'no-referrer');
  next();
});

// ============================================================
// RUTAS DE LA API
// ============================================================

// Ruta de salud del servidor
app.get('/api/health', async (req, res) => {
  try {
    await query('SELECT 1');
    res.json({ status: 'OK', database: 'connected', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'ERROR', database: 'disconnected', timestamp: new Date().toISOString() });
  }
});

// Rutas de autenticación
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/groups', groupsRoutes);
app.use('/api/messages', messagesRoutes);

// ============================================================
// MANEJO DE ERRORES
// ============================================================

// Ruta no encontrada
app.use(notFound);

// Manejador global de errores
app.use(errorHandler);

// ============================================================
// INICIAR SERVIDOR
// ============================================================
app.listen(PORT, () => {
  console.log('');
  console.log('🎓 ============================================');
  console.log('   ULimaSocial - Backend iniciado');
  console.log(`   ✅ Servidor corriendo en: http://localhost:${PORT}`);
  console.log(`   📧 Email configurado: ${process.env.EMAIL_USER || 'No configurado (modo DEV)'}`);
  console.log('   🔗 Endpoints disponibles:');
  console.log(`      POST /api/auth/register`);
  console.log(`      POST /api/auth/verify`);
  console.log(`      POST /api/auth/resend-code`);
  console.log(`      POST /api/auth/login`);
  console.log(`      POST /api/auth/forgot-password`);
  console.log(`      POST /api/auth/reset-password`);
  console.log('🎓 ============================================');
  console.log('');
});

export default app;
