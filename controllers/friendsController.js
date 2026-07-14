import { query } from '../db.js';

const userColumns = `u.id, u.name, u.last_name AS "lastName", u.student_code AS "studentCode",
  u.entry_year AS "entryYear", u.email, u.career, u.cycle::text AS cycle,
  u.profile_picture AS "profilePicture", u.bio`;

export const listFriends = async (req, res, next) => {
  try {
    const [friends, sent, received] = await Promise.all([
      query(
        `SELECT ${userColumns} FROM friendships f
         JOIN users u ON u.id = CASE WHEN f.requester_id = $1 THEN f.addressee_id ELSE f.requester_id END
         WHERE f.status = 'accepted' AND (f.requester_id = $1 OR f.addressee_id = $1)
         ORDER BY u.name, u.last_name`, [req.userId]
      ),
      query(
        `SELECT ${userColumns}, f.created_at AS "sentAt" FROM friendships f
         JOIN users u ON u.id = f.addressee_id
         WHERE f.requester_id = $1 AND f.status = 'pending' ORDER BY f.created_at DESC`, [req.userId]
      ),
      query(
        `SELECT ${userColumns}, f.created_at AS "receivedAt" FROM friendships f
         JOIN users u ON u.id = f.requester_id
         WHERE f.addressee_id = $1 AND f.status = 'pending' ORDER BY f.created_at DESC`, [req.userId]
      ),
    ]);
    res.json({ friends: friends.rows, sent: sent.rows, received: received.rows });
  } catch (error) { next(error); }
};

export const sendRequest = async (req, res, next) => {
  try {
    const targetId = req.params.userId;
    if (targetId === req.userId) return res.status(400).json({ message: 'No puedes agregarte a ti mismo' });
    const existing = await query(
      `SELECT requester_id AS "requesterId", addressee_id AS "addresseeId", status
       FROM friendships WHERE (requester_id=$1 AND addressee_id=$2) OR (requester_id=$2 AND addressee_id=$1)`,
      [req.userId, targetId]
    );
    if (existing.rowCount) return res.status(409).json({ message: 'Ya existe una relación o solicitud pendiente' });
    await query("INSERT INTO friendships (requester_id, addressee_id, status) VALUES ($1,$2,'pending')", [req.userId, targetId]);
    res.status(201).json({ message: 'Solicitud enviada' });
  } catch (error) { next(error); }
};

export const acceptRequest = async (req, res, next) => {
  try {
    const result = await query(
      "UPDATE friendships SET status='accepted', updated_at=NOW() WHERE requester_id=$1 AND addressee_id=$2 AND status='pending'",
      [req.params.userId, req.userId]
    );
    if (!result.rowCount) return res.status(404).json({ message: 'Solicitud no encontrada' });
    res.json({ message: 'Solicitud aceptada' });
  } catch (error) { next(error); }
};

export const removeRequest = async (req, res, next) => {
  try {
    await query(
      "DELETE FROM friendships WHERE status='pending' AND ((requester_id=$1 AND addressee_id=$2) OR (requester_id=$2 AND addressee_id=$1))",
      [req.userId, req.params.userId]
    );
    res.status(204).end();
  } catch (error) { next(error); }
};

export const removeFriend = async (req, res, next) => {
  try {
    await query(
      "DELETE FROM friendships WHERE status='accepted' AND ((requester_id=$1 AND addressee_id=$2) OR (requester_id=$2 AND addressee_id=$1))",
      [req.userId, req.params.userId]
    );
    res.status(204).end();
  } catch (error) { next(error); }
};
