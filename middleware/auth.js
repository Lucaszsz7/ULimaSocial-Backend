import { verifyAccessToken } from '../utils/security.js';

export const requireAuth = (req, res, next) => {
  try {
    const authorization = req.get('authorization') || '';
    const [scheme, token] = authorization.split(' ');
    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ message: 'Debes iniciar sesión' });
    }
    const payload = verifyAccessToken(token);
    req.userId = payload.sub;
    next();
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
};
