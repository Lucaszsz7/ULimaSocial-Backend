import { Router } from 'express';
import { addComment, createPost, deletePost, listPosts, toggleLike } from '../controllers/postsController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);
router.get('/', listPosts);
router.post('/', createPost);
router.delete('/:postId', deletePost);
router.post('/:postId/like', toggleLike);
router.post('/:postId/comments', addComment);
export default router;
