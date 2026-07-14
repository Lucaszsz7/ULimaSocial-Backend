import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import {
  deleteUnverifiedById,
  findByIdentifierWithPassword,
  findVerificationState,
  findVerifiedById,
  insert,
  searchVerified,
  updateById,
  updatePasswordWithReset,
  updateResetCode,
  updateVerificationCode,
  verifyByEmailAndCode,
} from '../models/userModel.js';
import { codeExpiresAt, generateOneTimeCode, hashOneTimeCode } from '../utils/security.js';

const normalizeEmail = (email) => String(email).trim().toLowerCase();

const duplicateMessage = (error) => {
  if (error.code !== '23505') return null;
  return error.constraint?.includes('email')
    ? 'Ya existe una cuenta con ese correo institucional'
    : 'Ya existe una cuenta con ese código universitario';
};

export const createUser = async (userData) => {
  const verificationCode = generateOneTimeCode();
  const passwordHash = await bcrypt.hash(userData.password, 12);

  try {
    const user = await insert({
      id: randomUUID(),
      name: userData.name.trim(),
      lastName: userData.lastName.trim(),
      studentCode: userData.studentCode,
      entryYear: userData.studentCode.slice(0, 4),
      email: normalizeEmail(userData.email),
      passwordHash,
      career: userData.career,
      cycle: Number(userData.cycle),
      profilePicture: userData.profilePicture || '',
      verificationCodeHash: hashOneTimeCode(verificationCode),
      verificationExpiresAt: codeExpiresAt(),
    });
    return { user, verificationCode };
  } catch (error) {
    const message = duplicateMessage(error);
    if (message) throw Object.assign(new Error(message), { status: 409 });
    throw error;
  }
};

export const removeUnverifiedUser = async (userId) => {
  await deleteUnverifiedById(userId);
};

export const verifyUserAccount = async (email, code) => {
  const normalizedEmail = normalizeEmail(email);
  const codeHash = hashOneTimeCode(code);
  const user = await verifyByEmailAndCode(normalizedEmail, codeHash);

  if (!user) {
    const state = await findVerificationState(normalizedEmail, codeHash);
    console.warn('[VERIFY] Verificación rechazada', {
      email: normalizedEmail,
      userFound: Boolean(state),
      alreadyVerified: state?.verified ?? false,
      codeMatches: state?.codeMatches ?? false,
      codeActive: state?.codeActive ?? false,
    });
    throw Object.assign(new Error('Código incorrecto o vencido'), { status: 400 });
  }
  return user;
};

export const regenerateVerificationCode = async (email) => {
  const code = generateOneTimeCode();
  const user = await updateVerificationCode(
    normalizeEmail(email),
    hashOneTimeCode(code),
    codeExpiresAt()
  );
  if (!user) throw Object.assign(new Error('Cuenta inexistente o ya verificada'), { status: 400 });
  return { code, user };
};

export const authenticateUser = async (identifier, password) => {
  const user = await findByIdentifierWithPassword(String(identifier).trim());
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw Object.assign(new Error('Credenciales incorrectas'), { status: 401 });
  }
  if (!user.verified) throw Object.assign(new Error('Primero verifica tu correo institucional'), { status: 403 });
  delete user.passwordHash;
  return user;
};

export const setPasswordResetCode = async (email) => {
  const code = generateOneTimeCode();
  const user = await updateResetCode(normalizeEmail(email), hashOneTimeCode(code), codeExpiresAt());
  return user ? { code, user } : null;
};

export const resetPassword = async (email, code, newPassword) => {
  const passwordHash = await bcrypt.hash(newPassword, 12);
  const user = await updatePasswordWithReset(
    normalizeEmail(email),
    hashOneTimeCode(code),
    passwordHash
  );
  if (!user) throw Object.assign(new Error('Código incorrecto o vencido'), { status: 400 });
};

export const getUserById = (userId) => findVerifiedById(userId);

export const updateCurrentUser = (userId, updates) => updateById(userId, updates);

export const searchUsers = (queryText, currentUserId) => searchVerified(queryText, currentUserId);
