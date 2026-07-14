import { Router } from 'express';
import { createGroup, joinGroup, leaveGroup, listGroups } from '../controllers/groupsController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);
router.get('/', listGroups);
router.post('/', createGroup);
router.post('/:groupId/members', joinGroup);
router.delete('/:groupId/members/me', leaveGroup);
export default router;
