import { Router } from 'express';
import { createDirectConversation, listConversations, markRead, sendMessage } from '../controllers/messagesController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);
router.get('/conversations', listConversations);
router.post('/conversations/direct/:userId', createDirectConversation);
router.post('/conversations/:conversationId/messages', sendMessage);
router.patch('/conversations/:conversationId/read', markRead);
export default router;
