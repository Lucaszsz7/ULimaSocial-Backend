import {
  createMessageForMember,
  findConversationsForUser,
  findMessagesForConversations,
  findOrCreateDirect,
  markReadForMember,
} from '../models/messageModel.js';

export const listConversations = async (req, res, next) => {
  try {
    const conversations = await findConversationsForUser(req.userId);
    if (!conversations.length) return res.json({ conversations: [] });

    const messages = await findMessagesForConversations(conversations.map((item) => item.id));
    const byConversation = messages.reduce((map, message) => {
      (map[message.conversationId] ||= []).push({
        id: message.id,
        text: message.text,
        sent: message.senderId === req.userId,
        createdAt: message.createdAt,
      });
      return map;
    }, {});

    res.json({
      conversations: conversations.map((item) => ({
        id: item.id,
        contacto: {
          id: item.contactId,
          name: item.contactName,
          lastName: item.contactLastName,
          career: item.contactCareer,
          cycle: item.contactCycle,
          profilePicture: item.contactProfilePicture,
        },
        mensajes: byConversation[item.id] || [],
        unread: item.unread,
        online: false,
      })),
    });
  } catch (error) { next(error); }
};

export const createDirectConversation = async (req, res, next) => {
  try {
    const targetId = req.params.userId;
    if (targetId === req.userId) return res.status(400).json({ message: 'No puedes conversar contigo mismo' });
    const conversationId = await findOrCreateDirect(req.userId, targetId);
    res.status(201).json({ conversationId });
  } catch (error) { next(error); }
};

export const sendMessage = async (req, res, next) => {
  try {
    const content = String(req.body.content || '').trim();
    if (!content || content.length > 500) return res.status(400).json({ message: 'El mensaje debe tener entre 1 y 500 caracteres' });
    const message = await createMessageForMember(req.params.conversationId, req.userId, content);
    if (!message) return res.status(403).json({ message: 'No perteneces a esta conversación' });
    res.status(201).json({ message: { ...message, sent: true } });
  } catch (error) { next(error); }
};

export const markRead = async (req, res, next) => {
  try {
    await markReadForMember(req.params.conversationId, req.userId);
    res.status(204).end();
  } catch (error) { next(error); }
};
