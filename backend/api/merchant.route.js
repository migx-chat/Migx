const express = require('express');
const router = express.Router();
const merchantService = require('../services/merchantService');
const userService = require('../services/userService');

router.post('/create', async (req, res) => {
  try {
    const { userId, mentorId, commissionRate = 30 } = req.body;
    
    if (!userId || !mentorId) {
      return res.status(400).json({ error: 'User ID and Mentor ID are required' });
    }
    
    const isMentor = await userService.isMentor(mentorId);
    if (!isMentor) {
      return res.status(403).json({ error: 'Only mentors can create merchants' });
    }
    
    const result = await merchantService.createMerchant(userId, mentorId, commissionRate);
    
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    
    res.json({
      success: true,
      merchant: result.merchant
    });
    
  } catch (error) {
    console.error('Create merchant error:', error);
    res.status(500).json({ error: 'Failed to create merchant' });
  }
});

router.post('/disable', async (req, res) => {
  try {
    const { merchantId, mentorId } = req.body;
    
    if (!merchantId || !mentorId) {
      return res.status(400).json({ error: 'Merchant ID and Mentor ID are required' });
    }
    
    const result = await merchantService.disableMerchant(merchantId, mentorId);
    
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    
    res.json({
      success: true
    });
    
  } catch (error) {
    console.error('Disable merchant error:', error);
    res.status(500).json({ error: 'Failed to disable merchant' });
  }
});

router.post('/enable', async (req, res) => {
  try {
    const { merchantId, mentorId } = req.body;
    
    if (!merchantId || !mentorId) {
      return res.status(400).json({ error: 'Merchant ID and Mentor ID are required' });
    }
    
    const result = await merchantService.enableMerchant(merchantId, mentorId);
    
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    
    res.json({
      success: true
    });
    
  } catch (error) {
    console.error('Enable merchant error:', error);
    res.status(500).json({ error: 'Failed to enable merchant' });
  }
});

router.get('/profile/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const profile = await merchantService.getMerchantProfile(id);
    
    if (!profile) {
      return res.status(404).json({ error: 'Merchant not found' });
    }
    
    res.json({
      merchant: profile
    });
    
  } catch (error) {
    console.error('Get merchant profile error:', error);
    res.status(500).json({ error: 'Failed to get merchant profile' });
  }
});

router.get('/income/:merchantId', async (req, res) => {
  try {
    const { merchantId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    const income = await merchantService.getMerchantIncomeTotal(merchantId);
    const spendLogs = await merchantService.getMerchantSpendLogs(merchantId, parseInt(limit), parseInt(offset));
    
    res.json({
      merchantId,
      income,
      transactions: spendLogs,
      count: spendLogs.length
    });
    
  } catch (error) {
    console.error('Get merchant income error:', error);
    res.status(500).json({ error: 'Failed to get merchant income' });
  }
});

router.get('/list', async (req, res) => {
  try {
    const { activeOnly = 'true', limit = 50 } = req.query;
    const merchants = await merchantService.getAllMerchants(activeOnly === 'true', parseInt(limit));
    
    res.json({
      merchants,
      count: merchants.length
    });
    
  } catch (error) {
    console.error('Get merchants error:', error);
    res.status(500).json({ error: 'Failed to get merchants' });
  }
});

router.post('/withdraw', async (req, res) => {
  try {
    const { merchantId, amount } = req.body;
    
    if (!merchantId || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid merchant ID and amount required' });
    }
    
    const result = await merchantService.withdrawMerchantEarnings(merchantId, amount);
    
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    
    res.json({
      success: true,
      amount,
      newBalance: result.newBalance
    });
    
  } catch (error) {
    console.error('Withdraw error:', error);
    res.status(500).json({ error: 'Withdrawal failed' });
  }
});

router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const merchant = await merchantService.getMerchantByUserId(userId);
    
    if (!merchant) {
      return res.status(404).json({ error: 'Merchant not found for this user' });
    }
    
    res.json({
      merchant
    });
    
  } catch (error) {
    console.error('Get merchant by user error:', error);
    res.status(500).json({ error: 'Failed to get merchant' });
  }
});

module.exports = router;
