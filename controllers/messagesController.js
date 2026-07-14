import { randomUUID } from 'crypto';
import { query, withTransaction } from '../db.js';

const directKey = (first, second) => [first, second].sort().join(':');

export const listConversations = async (req, res, next) => {
  try {
    const conversations = await query(
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
      [req.userId]
    );
    if (!conversations.rowCount) return res.json({ conversations: [] });

    const ids = conversations.rows.map((item) => item.id);
    const messages = await query(
      `SELECT id, conversation_id AS "conversationId", sender_id AS "senderId",
              content AS text, created_at AS "createdAt"
       FROM messages WHERE conversation_id = ANY($1::uuid[]) ORDER BY created_at`, [ids]
    );
    const byConversation = messages.rows.reduce((map, message) => {
      (map[message.conversationId] ||= []).push({
        id: message.id,
        text: message.text,
        sent: message.senderId === req.userId,
        createdAt: message.createdAt,
      });
      return map;
    }, {});
    res.json({
      conversations: conversations.rows.map((item) => ({
        id: item.id,
        contacto: {
          id: item.contactId,
          name: item.contactName,
          lastName: item.contactLastName,
          career: item.contactCareer,
          cycle: item.contactCycle,
          profilePicture: item.contactProfilePicture,
        },
        mensajes: byConversation[item.id] || [],
        unread: item.unread,
        online: false,
      })),
    });
  } catch (error) { next(error); }
};

export const createDirectConversation = async (req, res, next) => {
  try {
    const targetId = req.params.userId;
    if (targetId === req.userId) return res.status(400).json({ message: 'No puedes conversar contigo mismo' });
    const conversationId = await withTransaction(async (client) => {
      const exists = await client.query('SELECT id FROM users WHERE id=$1 AND verified=TRUE', [targetId]);
      if (!exists.rowCount) throw Object.assign(new Error('Usuario no encontrado'), { status: 404 });
      const id = randomUUID();
      const created = await client.query(
        `INSERT INTO conversations (id, direct_key) VALUES ($1,$2)
         ON CONFLICT (direct_key) DO UPDATE SET direct_key=EXCLUDED.direct_key RETURNING id`,
        [id, directKey(req.userId, targetId)]
      );
      await client.query(
        `INSERT INTO conversation_members (conversation_id, user_id) VALUES ($1,$2),($1,$3)
         ON CONFLICT DO NOTHING`, [created.rows[0].id, req.userId, targetId]
      );
      return created.rows[0].id;
    });
    res.status(201).json({ conversationId });
  } catch (error) { next(error); }
};

export const sendMessage = async (req, res, next) => {
  try {
    const content = String(req.body.content || '').trim();
    if (!content || content.length > 500) return res.status(400).json({ message: 'El mensaje debe tener entre 1 y 500 caracteres' });
    const result = await query(
      `INSERT INTO messages (id, conversation_id, sender_id, content)
       SELECT $1,$2,$3,$4 WHERE EXISTS (
         SELECT 1 FROM conversation_members WHERE conversation_id=$2 AND user_id=$3
       ) RETURNING id, content AS text, created_at AS "createdAt"`,
      [randomUUID(), req.params.conversationId, req.userId, content]
    );
    if (!result.rowCount) return res.status(403).json({ message: 'No perteneces a esta conversación' });
    res.status(201).json({ message: { ...result.rows[0], sent: true } });
  } catch (error) { next(error); }
};

export const markRead = async (req, res, next) => {
  try {
    await query(
      `UPDATE messages SET read_at=NOW() WHERE conversation_id=$1 AND sender_id<>$2
       AND read_at IS NULL AND EXISTS (
         SELECT 1 FROM conversation_members WHERE conversation_id=$1 AND user_id=$2
       )`, [req.params.conversationId, req.userId]
    );
    res.status(204).end();
  } catch (error) { next(error); }
};
