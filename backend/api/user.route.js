const express = require('express');
const router = express.Router();
const userService = require('../services/userService');
const { getUserLevel, getLeaderboard } = require('../utils/xpLeveling');

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await userService.getUserById(id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const levelData = await getUserLevel(id);
    
    res.json({
      id: user.id,
      username: user.username,
      avatar: user.avatar,
      role: user.role,
      status: user.status,
      credits: user.credits,
      level: levelData.level,
      xp: levelData.xp,
      progress: levelData.progress,
      nextLevelXp: levelData.nextLevelXp,
      createdAt: user.created_at
    });
    
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

router.get('/username/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const user = await userService.getUserByUsername(username);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const levelData = await getUserLevel(user.id);
    
    res.json({
      id: user.id,
      username: user.username,
      avatar: user.avatar,
      role: user.role,
      status: user.status,
      level: levelData.level,
      xp: levelData.xp,
      createdAt: user.created_at
    });
    
  } catch (error) {
    console.error('Get user by username error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

router.get('/search', async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;
    
    if (!q || q.length < 2) {
      return res.status(400).json({ error: 'Search query too short' });
    }
    
    const users = await userService.searchUsers(q, parseInt(limit));
    
    res.json({
      users,
      count: users.length
    });
    
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

router.get('/online', async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const users = await userService.getOnlineUsers(parseInt(limit));
    
    res.json({
      users,
      count: users.length
    });
    
  } catch (error) {
    console.error('Get online users error:', error);
    res.status(500).json({ error: 'Failed to get online users' });
  }
});

router.get('/leaderboard', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const leaderboard = await getLeaderboard(parseInt(limit));
    
    res.json({
      leaderboard
    });
    
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

router.put('/:id/role', async (req, res) => {
  try {
    const { id } = req.params;
    const { role, adminId } = req.body;
    
    if (!adminId) {
      return res.status(401).json({ error: 'Admin authentication required' });
    }
    
    const isAdmin = await userService.isAdmin(adminId);
    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin privileges required' });
    }
    
    const result = await userService.updateUserRole(id, role);
    
    if (!result || result.error) {
      return res.status(400).json({ error: result?.error || 'Failed to update role' });
    }
    
    res.json({
      success: true,
      user: result
    });
    
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

module.exports = router;
