import { randomUUID } from 'crypto';
import { query, withTransaction } from '../db.js';

export const findAllForUser = async (userId) => {
  const result = await query(
    `SELECT g.id, g.name AS nombre, g.career AS carrera, g.emoji,
            COUNT(gm.user_id)::int AS miembros,
            COALESCE(BOOL_OR(gm.user_id = $1), FALSE) AS unido
     FROM study_groups g LEFT JOIN group_members gm ON gm.group_id = g.id
     GROUP BY g.id ORDER BY g.created_at DESC`,
    [userId]
  );
  return result.rows;
};

export const createWithOwner = (group, ownerId) => withTransaction(async (client) => {
  const id = randomUUID();
  const result = await client.query(
    `INSERT INTO study_groups (id, name, career, emoji, owner_id) VALUES ($1,$2,$3,$4,$5)
     RETURNING id, name AS nombre, career AS carrera, emoji`,
    [id, group.name, group.career, group.emoji, ownerId]
  );
  await client.query('INSERT INTO group_members (group_id, user_id) VALUES ($1,$2)', [id, ownerId]);
  return { ...result.rows[0], miembros: 1, unido: true };
});

export const addMember = (groupId, userId) => (
  query(
    'INSERT INTO group_members (group_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
    [groupId, userId]
  )
);

export const removeMember = (groupId, userId) => (
  query('DELETE FROM group_members WHERE group_id=$1 AND user_id=$2', [groupId, userId])
);

