import { Router } from 'express';
import { acceptRequest, listFriends, removeFriend, removeRequest, sendRequest } from '../controllers/friendsController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);
router.get('/', listFriends);
router.post('/requests/:userId', sendRequest);
router.patch('/requests/:userId', acceptRequest);
router.delete('/requests/:userId', removeRequest);
router.delete('/:userId', removeFriend);
export default router;
