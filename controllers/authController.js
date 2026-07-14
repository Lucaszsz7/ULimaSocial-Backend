import {
  authenticateUser,
  createUser,
  getUserById,
  regenerateVerificationCode,
  removeUnverifiedUser,
  resetPassword,
  setPasswordResetCode,
  verifyUserAccount,
} from '../services/userService.js';
import { sendPasswordResetEmail, sendVerificationEmail } from '../services/emailService.js';
import { createAccessToken } from '../utils/security.js';

const institutionalEmail = /^[^\s@]+@aloe\.ulima\.edu\.pe$/i;

export const register = async (req, res, next) => {
  try {
    const { name, lastName, studentCode, email, password, career, cycle, profilePicture } = req.body;
    if (!name || !lastName || !studentCode || !email || !password || !career || !cycle) {
      return res.status(400).json({ message: 'Todos los campos son obligatorios' });
    }
    if (!institutionalEmail.test(email)) return res.status(400).json({ message: 'Usa tu correo @aloe.ulima.edu.pe' });
    if (!/^\d{8}$/.test(studentCode)) return res.status(400).json({ message: 'El código debe tener 8 dígitos' });
    if (password.length < 8) return res.status(400).json({ message: 'La contraseña debe tener al menos 8 caracteres' });
    if (!Number.isInteger(Number(cycle)) || Number(cycle) < 1 || Number(cycle) > 10) {
      return res.status(400).json({ message: 'El ciclo debe estar entre 1 y 10' });
    }

    const { user, verificationCode } = await createUser({
      name, lastName, studentCode, email, password, career, cycle, profilePicture,
    });
    try {
      await sendVerificationEmail(user.email, user.name, verificationCode);
    } catch (error) {
      await removeUnverifiedUser(user.id);
      throw error;
    }
    res.status(201).json({ message: 'Cuenta creada. Revisa tu correo para verificarla.', email: user.email });
  } catch (error) {
    next(error);
  }
};

export const verifyEmail = async (req, res, next) => {
  try {
    const { email, code } = req.body;
    if (!email || !/^\d{6}$/.test(code || '')) return res.status(400).json({ message: 'Correo y código válido son requeridos' });
    const user = await verifyUserAccount(email, code);
    res.json({ message: 'Cuenta verificada correctamente.', user });
  } catch (error) { next(error); }
};

export const resendCode = async (req, res, next) => {
  try {
    const { code, user } = await regenerateVerificationCode(req.body.email);
    await sendVerificationEmail(user.email, user.name, code);
    res.json({ message: 'Código reenviado.' });
  } catch (error) { next(error); }
};

export const login = async (req, res, next) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) return res.status(400).json({ message: 'Credenciales incompletas' });
    const user = await authenticateUser(identifier, password);
    res.json({ message: 'Inicio de sesión exitoso', token: createAccessToken(user.id), user });
  } catch (error) { next(error); }
};

export const me = async (req, res, next) => {
  try {
    const user = await getUserById(req.userId);
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
    res.json({ user });
  } catch (error) { next(error); }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!institutionalEmail.test(email || '')) return res.status(400).json({ message: 'Correo institucional inválido' });
    const reset = await setPasswordResetCode(email);
    if (reset) await sendPasswordResetEmail(reset.user.email, reset.user.name, reset.code);
    res.json({ message: 'Si la cuenta existe, recibirás un código de recuperación.' });
  } catch (error) { next(error); }
};

export const resetPasswordHandler = async (req, res, next) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !/^\d{6}$/.test(code || '') || !newPassword) {
      return res.status(400).json({ message: 'Todos los campos son requeridos' });
    }
    if (newPassword.length < 8) return res.status(400).json({ message: 'La contraseña debe tener al menos 8 caracteres' });
    await resetPassword(email, code, newPassword);
    res.json({ message: 'Contraseña actualizada.' });
  } catch (error) { next(error); }
};
