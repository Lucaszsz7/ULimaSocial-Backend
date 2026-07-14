import {
  addMember,
  createWithOwner,
  findAllForUser,
  removeMember,
} from '../models/groupModel.js';

export const listGroups = async (req, res, next) => {
  try {
    res.json({ groups: await findAllForUser(req.userId) });
  } catch (error) { next(error); }
};

export const createGroup = async (req, res, next) => {
  try {
    const name = String(req.body.nombre || req.body.name || '').trim();
    const career = String(req.body.carrera || req.body.career || '').trim();
    const emoji = String(req.body.emoji || '📚').slice(0, 16);
    if (!name || !career) return res.status(400).json({ message: 'Nombre y carrera son obligatorios' });

    const group = await createWithOwner({ name, career, emoji }, req.userId);
    res.status(201).json({ group });
  } catch (error) { next(error); }
};

export const joinGroup = async (req, res, next) => {
  try {
    await addMember(req.params.groupId, req.userId);
    res.status(201).json({ message: 'Te uniste al grupo' });
  } catch (error) { next(error); }
};

export const leaveGroup = async (req, res, next) => {
  try {
    await removeMember(req.params.groupId, req.userId);
    res.status(204).end();
  } catch (error) { next(error); }
};
