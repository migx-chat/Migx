const express = require('express');
const router = express.Router();
const streakService = require('../services/streakService');

// Update user streak on login
router.post('/check', async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }

    const result = await streakService.updateStreak(userId);
    res.json(result);
  } catch (error) {
    console.error('Error checking streak:', error);
    res.status(500).json({ error: 'Failed to check streak' });
  }
});

// Get streak info
router.get('/info/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const info = await streakService.getStreakInfo(userId);
    res.json(info);
  } catch (error) {
    console.error('Error getting streak info:', error);
    res.status(500).json({ error: 'Failed to get streak info' });
  }
});

module.exports = router;
