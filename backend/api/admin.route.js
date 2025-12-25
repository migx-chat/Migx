const express = require('express');
const router = express.Router();
const { superAdminMiddleware } = require('../middleware/auth');
const db = require('../db/db');

// Get dashboard stats
router.get('/stats', superAdminMiddleware, async (req, res) => {
  try {
    const totalUsers = await db.query('SELECT COUNT(*) as count FROM users');
    const activeRooms = await db.query('SELECT COUNT(*) as count FROM rooms');
    const pendingReports = await db.query('SELECT COUNT(*) as count FROM abuse_reports WHERE status = $1', ['pending']);

    res.json({
      totalUsers: totalUsers.rows[0]?.count || 0,
      activeRooms: activeRooms.rows[0]?.count || 0,
      pendingReports: pendingReports.rows[0]?.count || 0,
      onlineUsers: 0
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ message: 'Error fetching stats' });
  }
});

// Get all reports with pagination
router.get('/reports', superAdminMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;

    const reports = await db.query(
      `SELECT r.*, u.username as reporter_username, u2.username as target_username
       FROM abuse_reports r
       LEFT JOIN users u ON r.reporter_id = u.id
       LEFT JOIN users u2 ON r.target_id = u2.id
       ORDER BY r.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    res.json({ reports: reports.rows });
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ message: 'Error fetching reports' });
  }
});

// Update report status
router.patch('/reports/:id/status', superAdminMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    await db.query(
      'UPDATE abuse_reports SET status = $1 WHERE id = $2',
      [status, req.params.id]
    );
    res.json({ message: 'Report updated' });
  } catch (error) {
    console.error('Error updating report:', error);
    res.status(500).json({ message: 'Error updating report' });
  }
});

// Delete report
router.delete('/reports/:id', superAdminMiddleware, async (req, res) => {
  try {
    await db.query('DELETE FROM abuse_reports WHERE id = $1', [req.params.id]);
    res.json({ message: 'Report deleted' });
  } catch (error) {
    console.error('Error deleting report:', error);
    res.status(500).json({ message: 'Error deleting report' });
  }
});

// Get users with pagination
router.get('/users', superAdminMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const role = req.query.role;
    const limit = 20;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM users';
    const params = [];

    if (role) {
      query += ' WHERE role = $1';
      params.push(role);
      params.push(limit);
      params.push(offset);
    } else {
      params.push(limit);
      params.push(offset);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const users = await db.query(query, params);
    res.json({ users: users.rows });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Error fetching users' });
  }
});

// Ban user
router.patch('/users/:id/ban', superAdminMiddleware, async (req, res) => {
  try {
    await db.query(
      'UPDATE users SET is_suspended = true WHERE id = $1',
      [req.params.id]
    );
    res.json({ message: 'User banned' });
  } catch (error) {
    console.error('Error banning user:', error);
    res.status(500).json({ message: 'Error banning user' });
  }
});

// Unban user
router.patch('/users/:id/unban', superAdminMiddleware, async (req, res) => {
  try {
    await db.query(
      'UPDATE users SET is_suspended = false WHERE id = $1',
      [req.params.id]
    );
    res.json({ message: 'User unbanned' });
  } catch (error) {
    console.error('Error unbanning user:', error);
    res.status(500).json({ message: 'Error unbanning user' });
  }
});

// Update user role
router.patch('/users/:id/role', superAdminMiddleware, async (req, res) => {
  try {
    const { role } = req.body;
    const validRoles = ['user', 'mentor', 'merchant', 'admin', 'customer_service', 'super_admin'];
    
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    await db.query(
      'UPDATE users SET role = $1 WHERE id = $2',
      [role, req.params.id]
    );
    res.json({ message: 'User role updated', role });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ message: 'Error updating user role' });
  }
});

module.exports = router;
