const { query, getClient } = require('../db/db');
const { client } = require('../redis');
const { calculateCommission, calculateTaggedUserWinCommission, addMerchantIncome, getMerchantIncome, getMerchantStats, getMerchantTag } = require('../utils/merchantTags');

const createMerchant = async (userId, mentorId, commissionRate = 30) => {
  try {
    const mentorResult = await query(
      'SELECT role FROM users WHERE id = $1',
      [mentorId]
    );
    
    if (!mentorResult.rows[0] || !['mentor', 'admin'].includes(mentorResult.rows[0].role)) {
      return { success: false, error: 'Only mentors can create merchants' };
    }
    
    const existingMerchant = await query(
      'SELECT id FROM merchants WHERE user_id = $1',
      [userId]
    );
    
    if (existingMerchant.rows.length > 0) {
      return { success: false, error: 'User is already a merchant' };
    }
    
    await query(
      `UPDATE users SET role = 'merchant' WHERE id = $1`,
      [userId]
    );
    
    const result = await query(
      `INSERT INTO merchants (user_id, created_by, commission_rate)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [userId, mentorId, commissionRate]
    );
    
    return { success: true, merchant: result.rows[0] };
  } catch (error) {
    console.error('Error creating merchant:', error);
    return { success: false, error: 'Failed to create merchant' };
  }
};

const getMerchantByUserId = async (userId) => {
  try {
    const result = await query(
      `SELECT m.*, u.username, u.avatar
       FROM merchants m
       JOIN users u ON m.user_id = u.id
       WHERE m.user_id = $1`,
      [userId]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting merchant:', error);
    return null;
  }
};

const getMerchantById = async (merchantId) => {
  try {
    const result = await query(
      `SELECT m.*, u.username, u.avatar
       FROM merchants m
       JOIN users u ON m.user_id = u.id
       WHERE m.id = $1`,
      [merchantId]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting merchant by id:', error);
    return null;
  }
};

const disableMerchant = async (merchantId, mentorId) => {
  try {
    const mentorResult = await query(
      'SELECT role FROM users WHERE id = $1',
      [mentorId]
    );
    
    if (!mentorResult.rows[0] || !['mentor', 'admin'].includes(mentorResult.rows[0].role)) {
      return { success: false, error: 'Only mentors can disable merchants' };
    }
    
    const merchant = await getMerchantById(merchantId);
    if (!merchant) {
      return { success: false, error: 'Merchant not found' };
    }
    
    await query(
      `UPDATE merchants SET active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [merchantId]
    );
    
    await query(
      `UPDATE users SET role = 'user' WHERE id = $1`,
      [merchant.user_id]
    );
    
    return { success: true };
  } catch (error) {
    console.error('Error disabling merchant:', error);
    return { success: false, error: 'Failed to disable merchant' };
  }
};

const enableMerchant = async (merchantId, mentorId) => {
  try {
    const mentorResult = await query(
      'SELECT role FROM users WHERE id = $1',
      [mentorId]
    );
    
    if (!mentorResult.rows[0] || !['mentor', 'admin'].includes(mentorResult.rows[0].role)) {
      return { success: false, error: 'Only mentors can enable merchants' };
    }
    
    const merchant = await getMerchantById(merchantId);
    if (!merchant) {
      return { success: false, error: 'Merchant not found' };
    }
    
    await query(
      `UPDATE merchants SET active = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [merchantId]
    );
    
    await query(
      `UPDATE users SET role = 'merchant' WHERE id = $1`,
      [merchant.user_id]
    );
    
    return { success: true };
  } catch (error) {
    console.error('Error enabling merchant:', error);
    return { success: false, error: 'Failed to enable merchant' };
  }
};

const recordGameSpend = async (merchantId, userId, username, gameType, spendAmount) => {
  const dbClient = await getClient();
  
  try {
    await dbClient.query('BEGIN');
    
    const merchantResult = await dbClient.query(
      'SELECT * FROM merchants WHERE id = $1 AND active = TRUE',
      [merchantId]
    );
    
    if (merchantResult.rows.length === 0) {
      await dbClient.query('ROLLBACK');
      return { success: false, error: 'Merchant not found or inactive' };
    }
    
    const merchant = merchantResult.rows[0];
    const commissionAmount = calculateCommission(spendAmount, merchant.commission_rate);
    
    await dbClient.query(
      `INSERT INTO merchant_spend_logs (merchant_id, user_id, username, game_type, spend_amount, commission_amount)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [merchantId, userId, username, gameType, spendAmount, commissionAmount]
    );
    
    await dbClient.query(
      `UPDATE merchants SET total_income = total_income + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [commissionAmount, merchantId]
    );
    
    await addMerchantIncome(merchantId, commissionAmount);
    
    await dbClient.query('COMMIT');
    
    return {
      success: true,
      spendAmount,
      commissionAmount,
      merchantId
    };
  } catch (error) {
    await dbClient.query('ROLLBACK');
    console.error('Error recording game spend:', error);
    return { success: false, error: 'Failed to record game spend' };
  } finally {
    dbClient.release();
  }
};

const recordTaggedUserWin = async (merchantId, userId, username, gameType, winAmount) => {
  const dbClient = await getClient();
  
  try {
    await dbClient.query('BEGIN');
    
    const merchantResult = await dbClient.query(
      'SELECT * FROM merchants WHERE id = $1 AND active = TRUE',
      [merchantId]
    );
    
    if (merchantResult.rows.length === 0) {
      await dbClient.query('ROLLBACK');
      return { success: false, error: 'Merchant not found or inactive' };
    }
    
    const commissionAmount = calculateTaggedUserWinCommission(winAmount);
    
    await dbClient.query(
      `INSERT INTO merchant_spend_logs (merchant_id, user_id, username, game_type, spend_amount, commission_amount)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [merchantId, userId, username, gameType, winAmount, commissionAmount]
    );
    
    await dbClient.query(
      `UPDATE merchants SET total_income = total_income + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [commissionAmount, merchantId]
    );
    
    await addMerchantIncome(merchantId, commissionAmount);
    
    await dbClient.query('COMMIT');
    
    console.log(`💰 Merchant ${merchantId} earned ${commissionAmount} (10% of ${winAmount}) from tagged user ${username} win`);
    
    return {
      success: true,
      winAmount,
      commissionAmount,
      merchantId
    };
  } catch (error) {
    await dbClient.query('ROLLBACK');
    console.error('Error recording tagged user win:', error);
    return { success: false, error: 'Failed to record commission' };
  } finally {
    dbClient.release();
  }
};

const getMerchantIncomeTotal = async (merchantId) => {
  try {
    const redisIncome = await getMerchantIncome(merchantId);
    
    const dbResult = await query(
      'SELECT total_income FROM merchants WHERE id = $1',
      [merchantId]
    );
    
    return {
      cachedIncome: redisIncome,
      totalIncome: dbResult.rows[0]?.total_income || 0
    };
  } catch (error) {
    console.error('Error getting merchant income:', error);
    return { cachedIncome: 0, totalIncome: 0 };
  }
};

const getMerchantSpendLogs = async (merchantId, limit = 50, offset = 0) => {
  try {
    const result = await query(
      `SELECT * FROM merchant_spend_logs
       WHERE merchant_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [merchantId, limit, offset]
    );
    return result.rows;
  } catch (error) {
    console.error('Error getting merchant spend logs:', error);
    return [];
  }
};

const getMerchantProfile = async (merchantId) => {
  try {
    const merchant = await getMerchantById(merchantId);
    if (!merchant) return null;
    
    const stats = await getMerchantStats(merchantId);
    const income = await getMerchantIncomeTotal(merchantId);
    const tag = getMerchantTag(1, income.totalIncome);
    
    return {
      ...merchant,
      stats,
      income,
      tag
    };
  } catch (error) {
    console.error('Error getting merchant profile:', error);
    return null;
  }
};

const getAllMerchants = async (activeOnly = true, limit = 50) => {
  try {
    let queryStr = `
      SELECT m.*, u.username, u.avatar
      FROM merchants m
      JOIN users u ON m.user_id = u.id
    `;
    
    if (activeOnly) {
      queryStr += ' WHERE m.active = TRUE';
    }
    
    queryStr += ' ORDER BY m.total_income DESC LIMIT $1';
    
    const result = await query(queryStr, [limit]);
    return result.rows;
  } catch (error) {
    console.error('Error getting all merchants:', error);
    return [];
  }
};

const getMerchantDashboard = async (userId) => {
  try {
    const merchantResult = await query(
      `SELECT m.*, u.username, u.avatar
       FROM merchants m
       JOIN users u ON m.user_id = u.id
       WHERE m.user_id = $1`,
      [userId]
    );
    
    if (merchantResult.rows.length === 0) {
      return { success: false, error: 'Merchant not found' };
    }
    
    const merchant = merchantResult.rows[0];
    const merchantId = merchant.id;
    
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    
    const monthlyRechargeResult = await query(
      `SELECT COALESCE(SUM(amount), 0) as total_recharge
       FROM credit_logs
       WHERE to_user_id = $1
       AND transaction_type = 'topup'
       AND created_at >= $2 AND created_at <= $3`,
      [userId, startOfMonth, endOfMonth]
    );
    
    const totalRechargeThisMonth = parseInt(monthlyRechargeResult.rows[0]?.total_recharge || 0);
    
    return {
      success: true,
      dashboard: {
        merchantId: merchant.id,
        username: merchant.username,
        avatar: merchant.avatar,
        commissionRate: merchant.commission_rate,
        totalIncome: parseInt(merchant.total_income || 0),
        active: merchant.active,
        createdAt: merchant.created_at,
        expiredAt: merchant.expired_at,
        totalRechargeThisMonth
      }
    };
  } catch (error) {
    console.error('Error getting merchant dashboard:', error);
    return { success: false, error: 'Failed to get dashboard' };
  }
};

const getTaggedUserCommissions = async (userId, limit = 50, offset = 0) => {
  try {
    const merchantResult = await query(
      'SELECT id FROM merchants WHERE user_id = $1',
      [userId]
    );
    
    if (merchantResult.rows.length === 0) {
      return { success: false, error: 'Merchant not found' };
    }
    
    const merchantId = merchantResult.rows[0].id;
    
    const commissionsResult = await query(
      `SELECT msl.*, u.avatar as user_avatar
       FROM merchant_spend_logs msl
       LEFT JOIN users u ON msl.user_id = u.id
       WHERE msl.merchant_id = $1
       ORDER BY msl.created_at DESC
       LIMIT $2 OFFSET $3`,
      [merchantId, limit, offset]
    );
    
    const totalResult = await query(
      `SELECT COUNT(*) as count, COALESCE(SUM(commission_amount), 0) as total_commission
       FROM merchant_spend_logs
       WHERE merchant_id = $1`,
      [merchantId]
    );
    
    return {
      success: true,
      commissions: commissionsResult.rows,
      totalCount: parseInt(totalResult.rows[0]?.count || 0),
      totalCommission: parseInt(totalResult.rows[0]?.total_commission || 0)
    };
  } catch (error) {
    console.error('Error getting tagged user commissions:', error);
    return { success: false, error: 'Failed to get commissions' };
  }
};

const getMonthlyRechargeHistory = async (userId, months = 6) => {
  try {
    const history = [];
    const now = new Date();
    
    for (let i = 0; i < months; i++) {
      const targetMonth = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const startOfMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1);
      const endOfMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0, 23, 59, 59);
      
      const result = await query(
        `SELECT COALESCE(SUM(amount), 0) as total
         FROM credit_logs
         WHERE to_user_id = $1
         AND transaction_type = 'topup'
         AND created_at >= $2 AND created_at <= $3`,
        [userId, startOfMonth, endOfMonth]
      );
      
      history.push({
        month: targetMonth.toLocaleString('default', { month: 'short', year: 'numeric' }),
        year: targetMonth.getFullYear(),
        monthNum: targetMonth.getMonth() + 1,
        total: parseInt(result.rows[0]?.total || 0)
      });
    }
    
    return { success: true, history };
  } catch (error) {
    console.error('Error getting monthly recharge history:', error);
    return { success: false, error: 'Failed to get history' };
  }
};

const withdrawMerchantEarnings = async (merchantId, amount) => {
  const dbClient = await getClient();
  
  try {
    await dbClient.query('BEGIN');
    
    const merchant = await getMerchantById(merchantId);
    if (!merchant) {
      await dbClient.query('ROLLBACK');
      return { success: false, error: 'Merchant not found' };
    }
    
    const income = await getMerchantIncome(merchantId);
    if (income < amount) {
      await dbClient.query('ROLLBACK');
      return { success: false, error: 'Insufficient balance' };
    }
    
    await dbClient.query(
      'UPDATE users SET credits = credits + $1 WHERE id = $2',
      [amount, merchant.user_id]
    );
    
    await dbClient.query(
      `INSERT INTO credit_logs (to_user_id, to_username, amount, transaction_type, description)
       VALUES ($1, $2, $3, 'commission', 'Merchant earnings withdrawal')`,
      [merchant.user_id, merchant.username, amount]
    );
    
    await client.decrBy(`merchant:${merchantId}:income`, amount);
    
    await dbClient.query('COMMIT');
    
    return { success: true, amount, newBalance: income - amount };
  } catch (error) {
    await dbClient.query('ROLLBACK');
    console.error('Error withdrawing merchant earnings:', error);
    return { success: false, error: 'Withdrawal failed' };
  } finally {
    dbClient.release();
  }
};

module.exports = {
  createMerchant,
  getMerchantByUserId,
  getMerchantById,
  disableMerchant,
  enableMerchant,
  recordGameSpend,
  recordTaggedUserWin,
  getMerchantIncomeTotal,
  getMerchantSpendLogs,
  getMerchantProfile,
  getAllMerchants,
  withdrawMerchantEarnings,
  getMerchantDashboard,
  getTaggedUserCommissions,
  getMonthlyRechargeHistory
};
