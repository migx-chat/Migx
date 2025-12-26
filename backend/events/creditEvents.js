const creditService = require('../services/creditService');
const messageService = require('../services/messageService');
const userService = require('../services/userService');
const notificationService = require('../services/notificationService');
const { getUserSocket } = require('../utils/presence');
const { addXp, XP_REWARDS } = require('../utils/xpLeveling');

module.exports = (io, socket) => {
  const transferCredits = async (data) => {
    try {
      const { fromUserId, toUserId, toUsername, amount, message } = data;

      // 📋 Validation checks with explicit logging
      if (!fromUserId || !toUserId || !amount) {
        console.warn(`[TRANSFER] Missing fields: fromUserId=${fromUserId}, toUserId=${toUserId}, amount=${amount}`);
        socket.emit('credit:transfer:error', { message: 'Missing required fields' });
        return;
      }

      // Note: PIN is validated on frontend in AsyncStorage, not in backend
      // Backend focuses on authorization via Socket.IO authentication

      if (amount <= 0) {
        console.warn(`[TRANSFER] Invalid amount: ${amount}`);
        socket.emit('credit:transfer:error', { message: 'Amount must be positive' });
        return;
      }

      const validation = await creditService.validateTransfer(fromUserId, toUserId, amount);
      if (!validation.valid) {
        console.warn(`[TRANSFER] Validation failed: ${validation.error}`);
        socket.emit('credit:transfer:error', { message: validation.error });
        return;
      }

      let recipientUsername = toUsername;
      if (!recipientUsername) {
        const recipient = await userService.getUserById(toUserId);
        if (!recipient) {
          console.warn(`[TRANSFER] Recipient not found: ${toUserId}`);
          socket.emit('credit:transfer:error', { message: 'Recipient not found' });
          return;
        }
        recipientUsername = recipient.username;
      }

      console.log(`[TRANSFER] Processing: ${fromUserId} → ${toUserId} (${amount} credits)`);

      const result = await creditService.transferCredits(
        fromUserId,
        toUserId,
        amount,
        message || 'Credit transfer'
      );

      if (!result.success) {
        console.error(`[TRANSFER] Failed: ${result.error}`);
        socket.emit('credit:transfer:error', { message: result.error });
        return;
      }

      console.log(`[TRANSFER] Success: ${fromUserId} → ${toUserId} (${amount} credits)`);

      await addXp(fromUserId, XP_REWARDS.TRANSFER_CREDIT, 'transfer_credit', io);

      // Fetch user data for notification
      const fromUserData = await userService.getUserById(fromUserId);
      const toUserData = await userService.getUserById(toUserId);

      socket.emit('credit:transfer:success', {
        fromUser: fromUserData.username,
        toUser: toUserData.username,
        amount,
        newBalance: result.from.newBalance
      });

      // Send notification to receiver
      const notification = {
        type: 'credit',
        from: fromUserData.username,
        amount,
        message: `${fromUserData.username} sent you ${amount} credits`
      };

      await notificationService.addNotification(toUserData.username, notification);

      // Emit real-time notification if user is online
      const toUserSocketId = await getUserSocket(toUserId);
      if (toUserSocketId) {
        io.to(toUserSocketId).emit('notif:credit', notification);
      }

      const recipientSocketId = await getUserSocket(toUserId);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('credit:received', {
          transactionId: result.transactionId,
          amount,
          fromUsername: result.from.username,
          newBalance: result.to.newBalance,
          message: message || null
        });

        io.to(recipientSocketId).emit('pm:receive', {
          from: {
            userId: fromUserId,
            username: result.from.username
          },
          to: {
            userId: toUserId,
            username: result.to.username
          },
          message: `💰 ${result.from.username} sent you ${amount} credits${message ? `: "${message}"` : ''}`,
          timestamp: new Date().toISOString(),
          isSystem: true
        });
      }

      await messageService.savePrivateMessage(
        fromUserId,
        toUserId,
        result.from.username,
        result.to.username,
        `💰 Sent ${amount} credits${message ? `: "${message}"` : ''}`
      );

    } catch (error) {
      console.error('[TRANSFER] Unexpected error:', error);
      socket.emit('credit:transfer:error', { message: 'Transfer failed: ' + (error.message || 'Unknown error') });
    }
  };

  const getBalance = async (data) => {
    try {
      const { userId } = data;

      if (!userId) {
        socket.emit('error', { message: 'User ID required' });
        return;
      }

      const balance = await creditService.getBalance(userId);

      socket.emit('credit:balance', {
        userId,
        balance
      });

    } catch (error) {
      console.error('Error getting balance:', error);
      socket.emit('error', { message: 'Failed to get balance' });
    }
  };

  const getHistory = async (data) => {
    try {
      const { userId, limit = 50, offset = 0 } = data;

      if (!userId) {
        socket.emit('error', { message: 'User ID required' });
        return;
      }

      const history = await creditService.getTransactionHistory(userId, limit, offset);

      socket.emit('credit:history', {
        userId,
        transactions: history,
        hasMore: history.length === limit
      });

    } catch (error) {
      console.error('Error getting credit history:', error);
      socket.emit('error', { message: 'Failed to get credit history' });
    }
  };

  const topUp = async (data) => {
    try {
      const { userId, amount, adminId } = data;

      if (!adminId) {
        socket.emit('error', { message: 'Admin authentication required' });
        return;
      }

      const isAdmin = await userService.isAdmin(adminId);
      if (!isAdmin) {
        socket.emit('error', { message: 'Admin privileges required' });
        return;
      }

      const result = await creditService.addCredits(userId, amount, 'topup', 'Admin top-up');

      if (!result.success) {
        socket.emit('error', { message: result.error });
        return;
      }

      socket.emit('credit:topup:success', {
        userId,
        amount,
        newBalance: result.newBalance
      });

      const userSocketId = await getUserSocket(userId);
      if (userSocketId) {
        io.to(userSocketId).emit('credit:received', {
          amount,
          fromUsername: 'System',
          newBalance: result.newBalance,
          message: 'Credit top-up'
        });
      }

    } catch (error) {
      console.error('Error topping up credits:', error);
      socket.emit('error', { message: 'Top-up failed' });
    }
  };

  socket.on('credit:transfer', transferCredits);
  socket.on('credit:balance:get', getBalance);
  socket.on('credit:history:get', getHistory);
  socket.on('credit:topup', topUp);
};