import { randomUUID } from 'crypto';
import { query, withTransaction } from '../db.js';

export const listGroups = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT g.id, g.name AS nombre, g.career AS carrera, g.emoji,
              COUNT(gm.user_id)::int AS miembros,
              COALESCE(BOOL_OR(gm.user_id = $1), FALSE) AS unido
       FROM study_groups g LEFT JOIN group_members gm ON gm.group_id = g.id
       GROUP BY g.id ORDER BY g.created_at DESC`, [req.userId]
    );
    res.json({ groups: result.rows });
  } catch (error) { next(error); }
};

export const createGroup = async (req, res, next) => {
  try {
    const name = String(req.body.nombre || req.body.name || '').trim();
    const career = String(req.body.carrera || req.body.career || '').trim();
    const emoji = String(req.body.emoji || '📚').slice(0, 16);
    if (!name || !career) return res.status(400).json({ message: 'Nombre y carrera son obligatorios' });
    const group = await withTransaction(async (client) => {
      const id = randomUUID();
      const result = await client.query(
        `INSERT INTO study_groups (id, name, career, emoji, owner_id) VALUES ($1,$2,$3,$4,$5)
         RETURNING id, name AS nombre, career AS carrera, emoji`,
        [id, name, career, emoji, req.userId]
      );
      await client.query('INSERT INTO group_members (group_id, user_id) VALUES ($1,$2)', [id, req.userId]);
      return { ...result.rows[0], miembros: 1, unido: true };
    });
    res.status(201).json({ group });
  } catch (error) { next(error); }
};

export const joinGroup = async (req, res, next) => {
  try {
    await query('INSERT INTO group_members (group_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [req.params.groupId, req.userId]);
    res.status(201).json({ message: 'Te uniste al grupo' });
  } catch (error) { next(error); }
};

export const leaveGroup = async (req, res, next) => {
  try {
    await query('DELETE FROM group_members WHERE group_id=$1 AND user_id=$2', [req.params.groupId, req.userId]);
    res.status(204).end();
  } catch (error) { next(error); }
};
