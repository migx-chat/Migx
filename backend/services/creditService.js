const { query, getClient } = require('../db/db');
const { generateTransactionId } = require('../utils/idGenerator');
const { checkTransferLimit } = require('../utils/floodControl');

const transferCredits = async (fromUserId, toUserId, amount, description = null, requestId = null) => {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    
    // 🔐 STEP 5: Check for duplicate request_id (idempotency)
    if (requestId) {
      const existingTransfer = await client.query(
        'SELECT id FROM credit_logs WHERE request_id = $1',
        [requestId]
      );
      if (existingTransfer.rows.length > 0) {
        await client.query('ROLLBACK');
        return { success: false, error: 'Duplicate transfer request. Transaction already processed.' };
      }
    }
    
    const fromResult = await client.query(
      'SELECT id, username, credits FROM users WHERE id = $1 FOR UPDATE',
      [fromUserId]
    );
    
    if (fromResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return { success: false, error: 'Sender not found' };
    }
    
    const sender = fromResult.rows[0];
    
    if (sender.credits < amount) {
      await client.query('ROLLBACK');
      return { success: false, error: 'Insufficient credits' };
    }
    
    const toResult = await client.query(
      'SELECT id, username, credits FROM users WHERE id = $1 FOR UPDATE',
      [toUserId]
    );
    
    if (toResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return { success: false, error: 'Recipient not found' };
    }
    
    const recipient = toResult.rows[0];
    
    await client.query(
      'UPDATE users SET credits = credits - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [amount, fromUserId]
    );
    
    await client.query(
      'UPDATE users SET credits = credits + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [amount, toUserId]
    );
    
    await client.query(
      `INSERT INTO credit_logs (from_user_id, to_user_id, from_username, to_username, amount, transaction_type, description, request_id)
       VALUES ($1, $2, $3, $4, $5, 'transfer', $6, $7)`,
      [fromUserId, toUserId, sender.username, recipient.username, amount, description, requestId]
    );
    
    await client.query('COMMIT');
    
    const newFromCredits = Number(sender.credits) - Number(amount);
    const newToCredits = Number(recipient.credits) + Number(amount);
    
    return {
      success: true,
      transactionId: generateTransactionId(),
      from: {
        userId: fromUserId,
        username: sender.username,
        newBalance: newFromCredits
      },
      to: {
        userId: toUserId,
        username: recipient.username,
        newBalance: newToCredits
      },
      amount
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error transferring credits:', error);
    return { success: false, error: 'Transfer failed' };
  } finally {
    client.release();
  }
};

const addCredits = async (userId, amount, transactionType = 'topup', description = null) => {
  try {
    const result = await query(
      `UPDATE users SET credits = credits + $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, username, credits`,
      [amount, userId]
    );
    
    if (result.rows.length === 0) {
      return { success: false, error: 'User not found' };
    }
    
    await query(
      `INSERT INTO credit_logs (to_user_id, to_username, amount, transaction_type, description)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, result.rows[0].username, amount, transactionType, description]
    );
    
    return {
      success: true,
      userId,
      username: result.rows[0].username,
      newBalance: result.rows[0].credits
    };
  } catch (error) {
    console.error('Error adding credits:', error);
    return { success: false, error: 'Failed to add credits' };
  }
};

const deductCredits = async (userId, amount, transactionType = 'game_spend', description = null) => {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    
    const result = await client.query(
      'SELECT id, username, credits FROM users WHERE id = $1 FOR UPDATE',
      [userId]
    );
    
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return { success: false, error: 'User not found' };
    }
    
    const user = result.rows[0];
    
    if (user.credits < amount) {
      await client.query('ROLLBACK');
      return { success: false, error: 'Insufficient credits' };
    }
    
    await client.query(
      'UPDATE users SET credits = credits - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [amount, userId]
    );
    
    await client.query(
      `INSERT INTO credit_logs (from_user_id, from_username, amount, transaction_type, description)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, user.username, amount, transactionType, description]
    );
    
    await client.query('COMMIT');
    
    return {
      success: true,
      userId,
      username: user.username,
      newBalance: user.credits - amount
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deducting credits:', error);
    return { success: false, error: 'Failed to deduct credits' };
  } finally {
    client.release();
  }
};

const getBalance = async (userId) => {
  try {
    const result = await query(
      'SELECT credits FROM users WHERE id = $1',
      [userId]
    );
    return result.rows[0]?.credits || 0;
  } catch (error) {
    console.error('Error getting balance:', error);
    return 0;
  }
};

const getTransactionHistory = async (userId, limit = 50, offset = 0) => {
  try {
    const result = await query(
      `SELECT * FROM credit_logs
       WHERE from_user_id = $1 OR to_user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    return result.rows;
  } catch (error) {
    console.error('Error getting transaction history:', error);
    return [];
  }
};

const getTransferHistory = async (userId, limit = 50) => {
  try {
    const result = await query(
      `SELECT * FROM credit_logs
       WHERE (from_user_id = $1 OR to_user_id = $1)
       AND transaction_type = 'transfer'
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit]
    );
    return result.rows;
  } catch (error) {
    console.error('Error getting transfer history:', error);
    return [];
  }
};

const validateTransfer = async (fromUserId, toUserId, amount) => {
  // Transfer limits
  const MIN_AMOUNT = 1000;
  const MAX_AMOUNT = 1000000;
  
  // Self-transfer check (prevent user from sending to themselves)
  if (String(fromUserId) === String(toUserId)) {
    return { valid: false, error: 'Cannot transfer to yourself' };
  }
  
  // Amount must be positive
  if (amount <= 0) {
    return { valid: false, error: 'Amount must be positive' };
  }

  // Minimum amount check
  if (amount < MIN_AMOUNT) {
    return { valid: false, error: `Minimum transfer is ${MIN_AMOUNT} credits` };
  }
  
  // Maximum amount check (prevent large transfers)
  if (amount > MAX_AMOUNT) {
    return { valid: false, error: `Maximum transfer is ${MAX_AMOUNT} credits per transaction` };
  }
  
  // Rate limiting check (prevent spam transfers)
  const rateCheck = await checkTransferLimit(fromUserId);
  if (!rateCheck.allowed) {
    return { valid: false, error: rateCheck.message };
  }
  
  // Sufficient balance check
  const balance = await getBalance(fromUserId);
  if (balance < amount) {
    return { valid: false, error: 'Insufficient credits' };
  }
  
  return { valid: true };
};

module.exports = {
  transferCredits,
  addCredits,
  deductCredits,
  getBalance,
  getTransactionHistory,
  getTransferHistory,
  validateTransfer
};
