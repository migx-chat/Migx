const pool = require('../db');

/**
 * Service to handle mentor-merchant management and auto-demotion
 */
const mentorService = {
  /**
   * Check all merchants and demote those who haven't received 1,000,000 IDR 
   * from their mentor in the last 30 days or whose expiry has passed.
   */
  async checkMerchantStatus() {
    try {
      console.log('Running merchant status check...');
      
      // 1. Find all active merchants
      const merchants = await pool.query(
        "SELECT id, username, mentor_id, merchant_expired_at FROM users WHERE role = 'merchant' AND mentor_id IS NOT NULL"
      );

      for (const merchant of merchants.rows) {
        const now = new Date();
        const expiry = new Date(merchant.merchant_expired_at);

        // Check 1: Expiry date
        if (now > expiry) {
          await this.demoteMerchant(merchant.id, 'Subscription expired');
          continue;
        }

        // Check 2: Monthly transfer from mentor (1,000,000 IDR)
        // Look at mentor_payments table for the last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const paymentRes = await pool.query(
          `SELECT SUM(amount) as total 
           FROM mentor_payments 
           WHERE merchant_id = $1 AND mentor_id = $2 AND payment_date > $3`,
          [merchant.id, merchant.mentor_id, thirtyDaysAgo]
        );

        const totalPaid = parseInt(paymentRes.rows[0].total || '0');
        if (totalPaid < 1000000) {
          await this.demoteMerchant(merchant.id, `Insufficient monthly payment (${totalPaid}/1,000,000)`);
        }
      }
    } catch (error) {
      console.error('Error in checkMerchantStatus:', error);
    }
  },

  async demoteMerchant(userId, reason) {
    console.log(`Demoting user ${userId} to regular user. Reason: ${reason}`);
    await pool.query(
      "UPDATE users SET role = 'user', mentor_id = NULL, merchant_expired_at = NULL WHERE id = $1",
      [userId]
    );
    
    // Log demotion in audit_logs if available
    await pool.query(
      "INSERT INTO audit_logs (action, target_id, details) VALUES ($1, $2, $3)",
      ['MERCHANT_DEMOTION', userId, reason]
    ).catch(err => console.log('Audit log failed (expected if table differs):', err.message));
  }
};

// Run check every hour
setInterval(() => mentorService.checkMerchantStatus(), 3600000);

module.exports = mentorService;