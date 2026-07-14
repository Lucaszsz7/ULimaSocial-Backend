import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { query } from '../db.js';
import { codeExpiresAt, generateOneTimeCode, hashOneTimeCode } from '../utils/security.js';

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

const normalizeEmail = (email) => String(email).trim().toLowerCase();

const duplicateMessage = (error) => {
  if (error.code !== '23505') return null;
  return error.constraint?.includes('email')
    ? 'Ya existe una cuenta con ese correo institucional'
    : 'Ya existe una cuenta con ese código universitario';
};

export const createUser = async (userData) => {
  const id = randomUUID();
  const verificationCode = generateOneTimeCode();
  const passwordHash = await bcrypt.hash(userData.password, 12);
  try {
    const result = await query(
      `INSERT INTO users (
        id, name, last_name, student_code, entry_year, email, password_hash,
        career, cycle, profile_picture, verification_code_hash, verification_expires_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING ${PUBLIC_USER_COLUMNS}`,
      [
        id,
        userData.name.trim(),
        userData.lastName.trim(),
        userData.studentCode,
        userData.studentCode.slice(0, 4),
        normalizeEmail(userData.email),
        passwordHash,
        userData.career,
        Number(userData.cycle),
        userData.profilePicture || '',
        hashOneTimeCode(verificationCode),
        codeExpiresAt(),
      ]
    );
    return { user: result.rows[0], verificationCode };
  } catch (error) {
    const message = duplicateMessage(error);
    if (message) throw Object.assign(new Error(message), { status: 409 });
    throw error;
  }
};

export const removeUnverifiedUser = async (userId) => {
  await query('DELETE FROM users WHERE id = $1 AND verified = FALSE', [userId]);
};

export const verifyUserAccount = async (email, code) => {
  const result = await query(
    `UPDATE users
     SET verified = TRUE, verification_code_hash = NULL, verification_expires_at = NULL
     WHERE email = $1 AND verified = FALSE
       AND verification_code_hash = $2 AND verification_expires_at > NOW()
     RETURNING ${PUBLIC_USER_COLUMNS}`,
    [normalizeEmail(email), hashOneTimeCode(code)]
  );
  if (!result.rowCount) throw Object.assign(new Error('Código incorrecto o vencido'), { status: 400 });
  return result.rows[0];
};

export const regenerateVerificationCode = async (email) => {
  const code = generateOneTimeCode();
  const result = await query(
    `UPDATE users
     SET verification_code_hash = $2, verification_expires_at = $3
     WHERE email = $1 AND verified = FALSE
     RETURNING name, email`,
    [normalizeEmail(email), hashOneTimeCode(code), codeExpiresAt()]
  );
  if (!result.rowCount) throw Object.assign(new Error('Cuenta inexistente o ya verificada'), { status: 400 });
  return { code, user: result.rows[0] };
};

export const authenticateUser = async (identifier, password) => {
  const result = await query(
    `SELECT ${PUBLIC_USER_COLUMNS}, password_hash AS "passwordHash"
     FROM users WHERE LOWER(email) = LOWER($1) OR student_code = $1 LIMIT 1`,
    [String(identifier).trim()]
  );
  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw Object.assign(new Error('Credenciales incorrectas'), { status: 401 });
  }
  if (!user.verified) throw Object.assign(new Error('Primero verifica tu correo institucional'), { status: 403 });
  delete user.passwordHash;
  return user;
};

export const setPasswordResetCode = async (email) => {
  const code = generateOneTimeCode();
  const result = await query(
    `UPDATE users SET reset_code_hash = $2, reset_expires_at = $3
     WHERE email = $1 AND verified = TRUE RETURNING name, email`,
    [normalizeEmail(email), hashOneTimeCode(code), codeExpiresAt()]
  );
  return result.rowCount ? { code, user: result.rows[0] } : null;
};

export const resetPassword = async (email, code, newPassword) => {
  const passwordHash = await bcrypt.hash(newPassword, 12);
  const result = await query(
    `UPDATE users SET password_hash = $3, reset_code_hash = NULL, reset_expires_at = NULL
     WHERE email = $1 AND reset_code_hash = $2 AND reset_expires_at > NOW()
     RETURNING id`,
    [normalizeEmail(email), hashOneTimeCode(code), passwordHash]
  );
  if (!result.rowCount) throw Object.assign(new Error('Código incorrecto o vencido'), { status: 400 });
};

export const getUserById = async (userId) => {
  const result = await query(`SELECT ${PUBLIC_USER_COLUMNS} FROM users WHERE id = $1 AND verified = TRUE`, [userId]);
  return result.rows[0] || null;
};

export const updateCurrentUser = async (userId, updates) => {
  const allowed = {
    name: 'name',
    lastName: 'last_name',
    career: 'career',
    cycle: 'cycle',
    entryYear: 'entry_year',
    bio: 'bio',
    profilePicture: 'profile_picture',
  };
  const entries = Object.entries(updates).filter(([key]) => allowed[key]);
  if (!entries.length) return getUserById(userId);
  const sets = entries.map(([key], index) => `${allowed[key]} = $${index + 2}`);
  const values = entries.map(([key, value]) => key === 'cycle' ? Number(value) : value);
  const result = await query(
    `UPDATE users SET ${sets.join(', ')} WHERE id = $1 RETURNING ${PUBLIC_USER_COLUMNS}`,
    [userId, ...values]
  );
  return result.rows[0];
};

export const searchUsers = async (queryText, currentUserId) => {
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
