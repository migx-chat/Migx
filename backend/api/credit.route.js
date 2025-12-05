const express = require('express');
const router = express.Router();
const creditService = require('../services/creditService');
const userService = require('../services/userService');

router.post('/transfer', async (req, res) => {
  try {
    const { fromUserId, toUserId, amount, message } = req.body;
    
    if (!fromUserId || !toUserId || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    if (amount <= 0) {
      return res.status(400).json({ error: 'Amount must be positive' });
    }
    
    const validation = await creditService.validateTransfer(fromUserId, toUserId, amount);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }
    
    const result = await creditService.transferCredits(fromUserId, toUserId, amount, message);
    
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    
    res.json({
      success: true,
      transactionId: result.transactionId,
      from: result.from,
      to: result.to,
      amount
    });
    
  } catch (error) {
    console.error('Transfer error:', error);
    res.status(500).json({ error: 'Transfer failed' });
  }
});

router.get('/balance/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const balance = await creditService.getBalance(userId);
    
    res.json({
      userId,
      balance
    });
    
  } catch (error) {
    console.error('Get balance error:', error);
    res.status(500).json({ error: 'Failed to get balance' });
  }
});

router.get('/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    const history = await creditService.getTransactionHistory(userId, parseInt(limit), parseInt(offset));
    
    res.json({
      userId,
      transactions: history,
      count: history.length,
      hasMore: history.length === parseInt(limit)
    });
    
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ error: 'Failed to get transaction history' });
  }
});

router.get('/transfers/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50 } = req.query;
    
    const transfers = await creditService.getTransferHistory(userId, parseInt(limit));
    
    res.json({
      userId,
      transfers,
      count: transfers.length
    });
    
  } catch (error) {
    console.error('Get transfers error:', error);
    res.status(500).json({ error: 'Failed to get transfer history' });
  }
});

router.post('/topup', async (req, res) => {
  try {
    const { userId, amount, adminId } = req.body;
    
    if (!adminId) {
      return res.status(401).json({ error: 'Admin authentication required' });
    }
    
    const isAdmin = await userService.isAdmin(adminId);
    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin privileges required' });
    }
    
    if (!userId || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid user ID and amount required' });
    }
    
    const result = await creditService.addCredits(userId, amount, 'topup', 'Admin top-up');
    
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    
    res.json({
      success: true,
      userId,
      amount,
      newBalance: result.newBalance
    });
    
  } catch (error) {
    console.error('Top-up error:', error);
    res.status(500).json({ error: 'Top-up failed' });
  }
});

module.exports = router;
