import { query } from '../db.js';

export const PUBLIC_USER_COLUMNS = `
  id,
  name,
  last_name AS "lastName",
  student_code AS "studentCode",
  entry_year AS "entryYear",
  email,
  career,
  cycle::text AS cycle,
  profile_picture AS "profilePicture",
  bio,
  verified,
  created_at AS "createdAt"
`;

export const insert = async (user) => {
  const result = await query(
    `INSERT INTO users (
      id, name, last_name, student_code, entry_year, email, password_hash,
      career, cycle, profile_picture, verification_code_hash, verification_expires_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
    RETURNING ${PUBLIC_USER_COLUMNS}`,
    [
      user.id,
      user.name,
      user.lastName,
      user.studentCode,
      user.entryYear,
      user.email,
      user.passwordHash,
      user.career,
      user.cycle,
      user.profilePicture,
      user.verificationCodeHash,
      user.verificationExpiresAt,
    ]
  );
  return result.rows[0];
};

export const deleteUnverifiedById = (userId) => (
  query('DELETE FROM users WHERE id = $1 AND verified = FALSE', [userId])
);

export const verifyByEmailAndCode = async (email, codeHash) => {
  const result = await query(
    `UPDATE users
     SET verified = TRUE, verification_code_hash = NULL, verification_expires_at = NULL
     WHERE email = $1 AND verified = FALSE
       AND verification_code_hash = $2 AND verification_expires_at > NOW()
     RETURNING ${PUBLIC_USER_COLUMNS}`,
    [email, codeHash]
  );
  return result.rows[0] || null;
};

export const findVerificationState = async (email, codeHash) => {
  const result = await query(
    `SELECT verified,
            verification_code_hash = $2 AS "codeMatches",
            verification_expires_at > NOW() AS "codeActive"
     FROM users WHERE email = $1 LIMIT 1`,
    [email, codeHash]
  );
  return result.rows[0] || null;
};

export const updateVerificationCode = async (email, codeHash, expiresAt) => {
  const result = await query(
    `UPDATE users
     SET verification_code_hash = $2, verification_expires_at = $3
     WHERE email = $1 AND verified = FALSE
     RETURNING name, email`,
    [email, codeHash, expiresAt]
  );
  return result.rows[0] || null;
};

export const findByIdentifierWithPassword = async (identifier) => {
  const result = await query(
    `SELECT ${PUBLIC_USER_COLUMNS}, password_hash AS "passwordHash"
     FROM users WHERE LOWER(email) = LOWER($1) OR student_code = $1 LIMIT 1`,
    [identifier]
  );
  return result.rows[0] || null;
};

export const updateResetCode = async (email, codeHash, expiresAt) => {
  const result = await query(
    `UPDATE users SET reset_code_hash = $2, reset_expires_at = $3
     WHERE email = $1 AND verified = TRUE RETURNING name, email`,
    [email, codeHash, expiresAt]
  );
  return result.rows[0] || null;
};

export const updatePasswordWithReset = async (email, codeHash, passwordHash) => {
  const result = await query(
    `UPDATE users SET password_hash = $3, reset_code_hash = NULL, reset_expires_at = NULL
     WHERE email = $1 AND reset_code_hash = $2 AND reset_expires_at > NOW()
     RETURNING id`,
    [email, codeHash, passwordHash]
  );
  return result.rows[0] || null;
};

export const findVerifiedById = async (userId) => {
  const result = await query(
    `SELECT ${PUBLIC_USER_COLUMNS} FROM users WHERE id = $1 AND verified = TRUE`,
    [userId]
  );
  return result.rows[0] || null;
};

const editableColumns = {
  name: 'name',
  lastName: 'last_name',
  career: 'career',
  cycle: 'cycle',
  entryYear: 'entry_year',
  bio: 'bio',
  profilePicture: 'profile_picture',
};

export const updateById = async (userId, updates) => {
  const entries = Object.entries(updates).filter(([key]) => editableColumns[key]);
  if (!entries.length) return findVerifiedById(userId);

  const sets = entries.map(([key], index) => `${editableColumns[key]} = $${index + 2}`);
  const values = entries.map(([key, value]) => key === 'cycle' ? Number(value) : value);
  const result = await query(
    `UPDATE users SET ${sets.join(', ')} WHERE id = $1 RETURNING ${PUBLIC_USER_COLUMNS}`,
    [userId, ...values]
  );
  return result.rows[0] || null;
};

export const searchVerified = async (queryText, currentUserId) => {
  const term = `%${String(queryText).trim()}%`;
  const result = await query(
    `SELECT ${PUBLIC_USER_COLUMNS} FROM users
     WHERE verified = TRUE AND id <> $2 AND (
       name ILIKE $1 OR last_name ILIKE $1 OR student_code ILIKE $1 OR career ILIKE $1
     ) ORDER BY name, last_name LIMIT 20`,
    [term, currentUserId]
  );
  return result.rows;
};

