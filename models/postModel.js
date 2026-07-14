import { randomUUID } from 'crypto';
import { query, withTransaction } from '../db.js';

export const findPostRows = async (authorId, viewerId) => {
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
  return result.rows;
};

export const findCommentsForPosts = async (postIds) => {
  if (!postIds.length) return [];
  const result = await query(
    `SELECT c.id, c.post_id AS "postId", c.content, c.created_at AS "createdAt",
            u.id AS "authorId", u.name AS "authorName", u.last_name AS "authorLastName",
            u.career AS "authorCareer", u.profile_picture AS "authorProfilePicture"
     FROM comments c JOIN users u ON u.id = c.author_id
     WHERE c.post_id = ANY($1::uuid[]) ORDER BY c.created_at`,
    [postIds]
  );
  return result.rows;
};

export const create = (authorId, content) => (
  query('INSERT INTO posts (id, author_id, content) VALUES ($1,$2,$3)', [randomUUID(), authorId, content])
);

export const deleteOwned = async (postId, authorId) => {
  const result = await query('DELETE FROM posts WHERE id = $1 AND author_id = $2', [postId, authorId]);
  return result.rowCount > 0;
};

export const toggleLike = (postId, userId) => withTransaction(async (client) => {
  const removed = await client.query(
    'DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2 RETURNING post_id',
    [postId, userId]
  );
  if (removed.rowCount) return false;
  await client.query('INSERT INTO post_likes (post_id, user_id) VALUES ($1,$2)', [postId, userId]);
  return true;
});

export const createComment = async (postId, authorId, content) => {
  const result = await query(
    `INSERT INTO comments (id, post_id, author_id, content) VALUES ($1,$2,$3,$4)
     RETURNING id, post_id AS "postId", content, created_at AS "createdAt"`,
    [randomUUID(), postId, authorId, content]
  );
  return result.rows[0];
};
