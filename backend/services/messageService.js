const { query } = require('../db/db');
const { generateMessageId } = require('../utils/idGenerator');

const saveMessage = async (roomId, userId, username, message, messageType = 'chat') => {
  try {
    const result = await query(
      `INSERT INTO messages (room_id, user_id, username, message, message_type)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, room_id, user_id, username, message, message_type, created_at`,
      [roomId, userId, username, message, messageType]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error saving message:', error);
    return null;
  }
};

const getMessages = async (roomId, limit = 50, offset = 0) => {
  try {
    const result = await query(
      `SELECT m.*, u.avatar
       FROM messages m
       LEFT JOIN users u ON m.user_id = u.id
       WHERE m.room_id = $1
       ORDER BY m.created_at DESC
       LIMIT $2 OFFSET $3`,
      [roomId, limit, offset]
    );
    return result.rows.reverse();
  } catch (error) {
    console.error('Error getting messages:', error);
    return [];
  }
};

const getMessageById = async (messageId) => {
  try {
    const result = await query(
      'SELECT * FROM messages WHERE id = $1',
      [messageId]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting message:', error);
    return null;
  }
};

const deleteMessage = async (messageId) => {
  try {
    await query('DELETE FROM messages WHERE id = $1', [messageId]);
    return true;
  } catch (error) {
    console.error('Error deleting message:', error);
    return false;
  }
};

const clearRoomMessages = async (roomId) => {
  try {
    await query('DELETE FROM messages WHERE room_id = $1', [roomId]);
    return true;
  } catch (error) {
    console.error('Error clearing room messages:', error);
    return false;
  }
};

const savePrivateMessage = async (fromUserId, toUserId, fromUsername, toUsername, message) => {
  try {
    const result = await query(
      `INSERT INTO private_messages (from_user_id, to_user_id, from_username, to_username, message)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [fromUserId, toUserId, fromUsername, toUsername, message]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error saving private message:', error);
    return null;
  }
};

const getPrivateMessages = async (userId1, userId2, limit = 50, offset = 0) => {
  try {
    const result = await query(
      `SELECT * FROM private_messages
       WHERE (from_user_id = $1 AND to_user_id = $2)
          OR (from_user_id = $2 AND to_user_id = $1)
       ORDER BY created_at DESC
       LIMIT $3 OFFSET $4`,
      [userId1, userId2, limit, offset]
    );
    return result.rows.reverse();
  } catch (error) {
    console.error('Error getting private messages:', error);
    return [];
  }
};

const getUnreadMessages = async (userId) => {
  try {
    const result = await query(
      `SELECT pm.*, u.avatar as from_avatar
       FROM private_messages pm
       LEFT JOIN users u ON pm.from_user_id = u.id
       WHERE pm.to_user_id = $1 AND pm.is_read = FALSE
       ORDER BY pm.created_at DESC`,
      [userId]
    );
    return result.rows;
  } catch (error) {
    console.error('Error getting unread messages:', error);
    return [];
  }
};

const markMessagesAsRead = async (userId, fromUserId) => {
  try {
    await query(
      `UPDATE private_messages SET is_read = TRUE
       WHERE to_user_id = $1 AND from_user_id = $2 AND is_read = FALSE`,
      [userId, fromUserId]
    );
    return true;
  } catch (error) {
    console.error('Error marking messages as read:', error);
    return false;
  }
};

const getRecentConversations = async (userId, limit = 20) => {
  try {
    const result = await query(
      `SELECT DISTINCT ON (other_user_id)
         CASE 
           WHEN from_user_id = $1 THEN to_user_id
           ELSE from_user_id
         END as other_user_id,
         CASE 
           WHEN from_user_id = $1 THEN to_username
           ELSE from_username
         END as other_username,
         message,
         created_at,
         is_read
       FROM private_messages
       WHERE from_user_id = $1 OR to_user_id = $1
       ORDER BY other_user_id, created_at DESC
       LIMIT $2`,
      [userId, limit]
    );
    return result.rows;
  } catch (error) {
    console.error('Error getting recent conversations:', error);
    return [];
  }
};

const createSystemMessage = (roomId, message) => {
  return {
    id: generateMessageId(),
    roomId,
    username: 'System',
    message,
    messageType: 'system',
    createdAt: new Date().toISOString()
  };
};

const createNoticeMessage = (roomId, message) => {
  return {
    id: generateMessageId(),
    roomId,
    username: '',
    message,
    messageType: 'notice',
    createdAt: new Date().toISOString()
  };
};

module.exports = {
  saveMessage,
  getMessages,
  getMessageById,
  deleteMessage,
  clearRoomMessages,
  savePrivateMessage,
  getPrivateMessages,
  getUnreadMessages,
  markMessagesAsRead,
  getRecentConversations,
  createSystemMessage,
  createNoticeMessage
};
