import { randomUUID } from 'crypto';
import { query, withTransaction } from '../db.js';

const loadPosts = async (authorId, viewerId) => {
  const result = await query(
    `SELECT p.id, p.author_id AS "authorId", p.content AS contenido,
            p.created_at AS "createdAt",
            COUNT(DISTINCT pl.user_id)::int AS likes,
            COALESCE(BOOL_OR(pl.user_id = $2), FALSE) AS "likedByMe",
            COUNT(DISTINCT c.id)::int AS comentarios
     FROM posts p
     LEFT JOIN post_likes pl ON pl.post_id = p.id
     LEFT JOIN comments c ON c.post_id = p.id
     WHERE ($1::uuid IS NULL OR p.author_id = $1)
     GROUP BY p.id ORDER BY p.created_at DESC LIMIT 100`,
    [authorId || null, viewerId]
  );
  if (!result.rowCount) return [];
  const ids = result.rows.map((post) => post.id);
  const comments = await query(
    `SELECT c.id, c.post_id AS "postId", c.content, c.created_at AS "createdAt",
            u.id AS "authorId", u.name AS "authorName", u.last_name AS "authorLastName",
            u.career AS "authorCareer", u.profile_picture AS "authorProfilePicture"
     FROM comments c JOIN users u ON u.id = c.author_id
     WHERE c.post_id = ANY($1::uuid[]) ORDER BY c.created_at`,
    [ids]
  );
  const byPost = comments.rows.reduce((map, comment) => {
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
  return result.rows.map((post) => ({ ...post, comments: byPost[post.id] || [] }));
};

export const listPosts = async (req, res, next) => {
  try { res.json({ posts: await loadPosts(req.query.authorId, req.userId) }); }
  catch (error) { next(error); }
};

export const createPost = async (req, res, next) => {
  try {
    const content = String(req.body.content || '').trim();
    if (!content || content.length > 2000) return res.status(400).json({ message: 'La publicación debe tener entre 1 y 2000 caracteres' });
    await query('INSERT INTO posts (id, author_id, content) VALUES ($1,$2,$3)', [randomUUID(), req.userId, content]);
    res.status(201).json({ posts: await loadPosts(req.userId, req.userId) });
  } catch (error) { next(error); }
};

export const deletePost = async (req, res, next) => {
  try {
    const result = await query('DELETE FROM posts WHERE id = $1 AND author_id = $2', [req.params.postId, req.userId]);
    if (!result.rowCount) return res.status(404).json({ message: 'Publicación no encontrada' });
    res.status(204).end();
  } catch (error) { next(error); }
};

export const toggleLike = async (req, res, next) => {
  try {
    const liked = await withTransaction(async (client) => {
      const removed = await client.query('DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2 RETURNING post_id', [req.params.postId, req.userId]);
      if (removed.rowCount) return false;
      await client.query('INSERT INTO post_likes (post_id, user_id) VALUES ($1,$2)', [req.params.postId, req.userId]);
      return true;
    });
    res.json({ liked });
  } catch (error) { next(error); }
};

export const addComment = async (req, res, next) => {
  try {
    const content = String(req.body.content || '').trim();
    if (!content || content.length > 180) return res.status(400).json({ message: 'El comentario debe tener entre 1 y 180 caracteres' });
    const result = await query(
      `INSERT INTO comments (id, post_id, author_id, content) VALUES ($1,$2,$3,$4)
       RETURNING id, post_id AS "postId", content, created_at AS "createdAt"`,
      [randomUUID(), req.params.postId, req.userId, content]
    );
    res.status(201).json({ comment: result.rows[0] });
  } catch (error) { next(error); }
};
