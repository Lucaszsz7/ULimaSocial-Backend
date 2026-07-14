import { Router } from 'express';
import { getUser, search, updateMe } from '../controllers/usersController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);
router.get('/', search);
router.patch('/me', updateMe);
router.get('/:userId', getUser);
export default router;
