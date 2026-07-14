import { getUserById, searchUsers, updateCurrentUser } from '../services/userService.js';

export const getUser = async (req, res, next) => {
  try {
    const user = await getUserById(req.params.userId);
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
    res.json({ user });
  } catch (error) { next(error); }
};

export const updateMe = async (req, res, next) => {
  try {
    if (req.body.bio?.length > 180) return res.status(400).json({ message: 'La biografía admite hasta 180 caracteres' });
    if (req.body.entryYear && !/^\d{4}$/.test(req.body.entryYear)) return res.status(400).json({ message: 'Año de ingreso inválido' });
    if (req.body.cycle && (!Number.isInteger(Number(req.body.cycle)) || Number(req.body.cycle) < 1 || Number(req.body.cycle) > 10)) {
      return res.status(400).json({ message: 'Ciclo inválido' });
    }
    const user = await updateCurrentUser(req.userId, req.body);
    res.json({ user });
  } catch (error) { next(error); }
};

export const search = async (req, res, next) => {
  try {
    const term = String(req.query.q || '').trim();
    if (term.length < 2) return res.json({ users: [] });
    res.json({ users: await searchUsers(term, req.userId) });
  } catch (error) { next(error); }
};
