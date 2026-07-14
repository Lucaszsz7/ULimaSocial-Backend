import { randomUUID } from 'crypto';
import { query, withTransaction } from '../db.js';

const directKey = (first, second) => [first, second].sort().join(':');

export const findConversationsForUser = async (userId) => {
  const result = await query(
    `SELECT c.id, u.id AS "contactId", u.name AS "contactName",
            u.last_name AS "contactLastName", u.career AS "contactCareer",
            u.cycle::text AS "contactCycle", u.profile_picture AS "contactProfilePicture",
            COUNT(m.id) FILTER (WHERE m.sender_id <> $1 AND m.read_at IS NULL)::int AS unread,
            MAX(m.created_at) AS "lastMessageAt"
     FROM conversations c
     JOIN conversation_members mine ON mine.conversation_id=c.id AND mine.user_id=$1
     JOIN conversation_members other ON other.conversation_id=c.id AND other.user_id<>$1
     JOIN users u ON u.id=other.user_id
     LEFT JOIN messages m ON m.conversation_id=c.id
     GROUP BY c.id, u.id ORDER BY COALESCE(MAX(m.created_at), c.created_at) DESC`,
    [userId]
  );
  return result.rows;
};

export const findMessagesForConversations = async (conversationIds) => {
  if (!conversationIds.length) return [];
  const result = await query(
    `SELECT id, conversation_id AS "conversationId", sender_id AS "senderId",
            content AS text, created_at AS "createdAt"
     FROM messages WHERE conversation_id = ANY($1::uuid[]) ORDER BY created_at`,
    [conversationIds]
  );
  return result.rows;
};

export const findOrCreateDirect = (currentUserId, targetUserId) => withTransaction(async (client) => {
  const exists = await client.query('SELECT id FROM users WHERE id=$1 AND verified=TRUE', [targetUserId]);
  if (!exists.rowCount) throw Object.assign(new Error('Usuario no encontrado'), { status: 404 });

  const created = await client.query(
    `INSERT INTO conversations (id, direct_key) VALUES ($1,$2)
     ON CONFLICT (direct_key) DO UPDATE SET direct_key=EXCLUDED.direct_key RETURNING id`,
    [randomUUID(), directKey(currentUserId, targetUserId)]
  );
  await client.query(
    `INSERT INTO conversation_members (conversation_id, user_id) VALUES ($1,$2),($1,$3)
     ON CONFLICT DO NOTHING`,
    [created.rows[0].id, currentUserId, targetUserId]
  );
  return created.rows[0].id;
});

export const createMessageForMember = async (conversationId, senderId, content) => {
  const result = await query(
    `INSERT INTO messages (id, conversation_id, sender_id, content)
     SELECT $1,$2,$3,$4 WHERE EXISTS (
       SELECT 1 FROM conversation_members WHERE conversation_id=$2 AND user_id=$3
     ) RETURNING id, content AS text, created_at AS "createdAt"`,
    [randomUUID(), conversationId, senderId, content]
  );
  return result.rows[0] || null;
};

export const markReadForMember = (conversationId, userId) => query(
  `UPDATE messages SET read_at=NOW() WHERE conversation_id=$1 AND sender_id<>$2
   AND read_at IS NULL AND EXISTS (
     SELECT 1 FROM conversation_members WHERE conversation_id=$1 AND user_id=$2
   )`,
  [conversationId, userId]
);

