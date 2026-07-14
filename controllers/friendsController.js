import {
  acceptPending,
  createPending,
  deleteAcceptedBetween,
  deletePendingBetween,
  findAllForUser,
  findBetween,
} from '../models/friendshipModel.js';

export const listFriends = async (req, res, next) => {
  try {
    res.json(await findAllForUser(req.userId));
  } catch (error) { next(error); }
};

export const sendRequest = async (req, res, next) => {
  try {
    const targetId = req.params.userId;
    if (targetId === req.userId) return res.status(400).json({ message: 'No puedes agregarte a ti mismo' });
    if (await findBetween(req.userId, targetId)) {
      return res.status(409).json({ message: 'Ya existe una relación o solicitud pendiente' });
    }
    await createPending(req.userId, targetId);
    res.status(201).json({ message: 'Solicitud enviada' });
  } catch (error) { next(error); }
};

export const acceptRequest = async (req, res, next) => {
  try {
    const accepted = await acceptPending(req.params.userId, req.userId);
    if (!accepted) return res.status(404).json({ message: 'Solicitud no encontrada' });
    res.json({ message: 'Solicitud aceptada' });
  } catch (error) { next(error); }
};

export const removeRequest = async (req, res, next) => {
  try {
    await deletePendingBetween(req.userId, req.params.userId);
    res.status(204).end();
  } catch (error) { next(error); }
};

export const removeFriend = async (req, res, next) => {
  try {
    await deleteAcceptedBetween(req.userId, req.params.userId);
    res.status(204).end();
  } catch (error) { next(error); }
};
