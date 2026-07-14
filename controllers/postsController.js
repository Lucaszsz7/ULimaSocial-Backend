import {
  create,
  createComment,
  deleteOwned,
  findCommentsForPosts,
  findPostRows,
  toggleLike as togglePostLike,
} from '../models/postModel.js';

const loadPosts = async (authorId, viewerId) => {
  const posts = await findPostRows(authorId, viewerId);
  if (!posts.length) return [];

  const comments = await findCommentsForPosts(posts.map((post) => post.id));
  const byPost = comments.reduce((map, comment) => {
    (map[comment.postId] ||= []).push({
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt,
      author: {
        id: comment.authorId,
        name: comment.authorName,
        lastName: comment.authorLastName,
        career: comment.authorCareer,
        profilePicture: comment.authorProfilePicture,
      },
    });
    return map;
  }, {});
  return posts.map((post) => ({ ...post, comments: byPost[post.id] || [] }));
};

export const listPosts = async (req, res, next) => {
  try { res.json({ posts: await loadPosts(req.query.authorId, req.userId) }); }
  catch (error) { next(error); }
};

export const createPost = async (req, res, next) => {
  try {
    const content = String(req.body.content || '').trim();
    if (!content || content.length > 2000) return res.status(400).json({ message: 'La publicación debe tener entre 1 y 2000 caracteres' });
    await create(req.userId, content);
    res.status(201).json({ posts: await loadPosts(req.userId, req.userId) });
  } catch (error) { next(error); }
};

export const deletePost = async (req, res, next) => {
  try {
    const deleted = await deleteOwned(req.params.postId, req.userId);
    if (!deleted) return res.status(404).json({ message: 'Publicación no encontrada' });
    res.status(204).end();
  } catch (error) { next(error); }
};

export const toggleLike = async (req, res, next) => {
  try {
    res.json({ liked: await togglePostLike(req.params.postId, req.userId) });
  } catch (error) { next(error); }
};

export const addComment = async (req, res, next) => {
  try {
    const content = String(req.body.content || '').trim();
    if (!content || content.length > 180) return res.status(400).json({ message: 'El comentario debe tener entre 1 y 180 caracteres' });
    const comment = await createComment(req.params.postId, req.userId, content);
    res.status(201).json({ comment });
  } catch (error) { next(error); }
};
