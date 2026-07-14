import { query } from '../db.js';

const userColumns = `u.id, u.name, u.last_name AS "lastName", u.student_code AS "studentCode",
  u.entry_year AS "entryYear", u.email, u.career, u.cycle::text AS cycle,
  u.profile_picture AS "profilePicture", u.bio`;

export const findAllForUser = async (userId) => {
  const [friends, sent, received] = await Promise.all([
    query(
      `SELECT ${userColumns} FROM friendships f
       JOIN users u ON u.id = CASE WHEN f.requester_id = $1 THEN f.addressee_id ELSE f.requester_id END
       WHERE f.status = 'accepted' AND (f.requester_id = $1 OR f.addressee_id = $1)
       ORDER BY u.name, u.last_name`, [userId]
    ),
    query(
      `SELECT ${userColumns}, f.created_at AS "sentAt" FROM friendships f
       JOIN users u ON u.id = f.addressee_id
       WHERE f.requester_id = $1 AND f.status = 'pending' ORDER BY f.created_at DESC`, [userId]
    ),
    query(
      `SELECT ${userColumns}, f.created_at AS "receivedAt" FROM friendships f
       JOIN users u ON u.id = f.requester_id
       WHERE f.addressee_id = $1 AND f.status = 'pending' ORDER BY f.created_at DESC`, [userId]
    ),
  ]);
  return { friends: friends.rows, sent: sent.rows, received: received.rows };
};

export const findBetween = async (firstUserId, secondUserId) => {
  const result = await query(
    `SELECT requester_id AS "requesterId", addressee_id AS "addresseeId", status
     FROM friendships WHERE (requester_id=$1 AND addressee_id=$2) OR (requester_id=$2 AND addressee_id=$1)`,
    [firstUserId, secondUserId]
  );
  return result.rows[0] || null;
};

export const createPending = (requesterId, addresseeId) => (
  query("INSERT INTO friendships (requester_id, addressee_id, status) VALUES ($1,$2,'pending')", [requesterId, addresseeId])
);

export const acceptPending = async (requesterId, addresseeId) => {
  const result = await query(
    "UPDATE friendships SET status='accepted', updated_at=NOW() WHERE requester_id=$1 AND addressee_id=$2 AND status='pending'",
    [requesterId, addresseeId]
  );
  return result.rowCount > 0;
};

export const deletePendingBetween = (firstUserId, secondUserId) => (
  query(
    "DELETE FROM friendships WHERE status='pending' AND ((requester_id=$1 AND addressee_id=$2) OR (requester_id=$2 AND addressee_id=$1))",
    [firstUserId, secondUserId]
  )
);

export const deleteAcceptedBetween = (firstUserId, secondUserId) => (
  query(
    "DELETE FROM friendships WHERE status='accepted' AND ((requester_id=$1 AND addressee_id=$2) OR (requester_id=$2 AND addressee_id=$1))",
    [firstUserId, secondUserId]
  )
);

