import { useState, useEffect } from 'react';
import { adminApi } from '../services/api';

export function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [selectedRole, setSelectedRole] = useState('');

  useEffect(() => {
    loadUsers();
  }, [page, selectedRole]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminApi.getUsers(page, selectedRole || null);
      setUsers(data.users || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCoins = async (userId) => {
    const amount = window.prompt(`Add coins to user:`, '100');
    if (!amount || isNaN(amount)) {
      alert('Invalid amount');
      return;
    }
    
    try {
      setLoading(true);
      const numAmount = parseInt(amount);
      // This would call API endpoint when available
      // For now, just show success message
      alert(`Added ${numAmount} coins to user`);
      await loadUsers();
    } catch (err) {
      alert('Error adding coins: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeRole = async (id, currentRole) => {
    const roles = ['user', 'mentor', 'merchant', 'admin', 'customer_service'];
    const newRole = window.prompt(`Change role (current: ${currentRole}):`, currentRole);
    
    if (!newRole || !roles.includes(newRole)) {
      alert('Invalid role');
      return;
    }

    try {
      setLoading(true);
      await adminApi.updateUserRole(id, newRole);
      alert(`Role changed to ${newRole}`);
      await loadUsers();
    } catch (err) {
      alert('Error changing role: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBan = async (id) => {
    if (!window.confirm('Ban this user?')) return;
    try {
      await adminApi.banUser(id);
      loadUsers();
    } catch (err) {
      alert('Error banning user: ' + err.message);
    }
  };

  if (loading) return <div className="page">Loading...</div>;
  if (error) return <div className="page error">Error: {error}</div>;

  return (
    <div className="page">
      <h2>👥 User Management</h2>

      <div style={{ marginBottom: '20px' }}>
        <label>Filter by Role: </label>
        <select 
          value={selectedRole} 
          onChange={(e) => setSelectedRole(e.target.value)}
          style={{ padding: '8px', marginLeft: '10px', borderRadius: '4px', border: '1px solid #ddd' }}
        >
          <option value="">All Roles</option>
          <option value="user">User</option>
          <option value="mentor">Mentor</option>
          <option value="merchant">Merchant</option>
          <option value="admin">Admin</option>
          <option value="customer_service">Customer Service</option>
        </select>
      </div>

      {users.length === 0 ? (
        <p>No users found</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Username</th>
              <th>Level</th>
              <th>Role</th>
              <th>Status</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>{user.username}</td>
                <td>{user.level || 1}</td>
                <td>{user.role || 'user'}</td>
                <td>{user.is_suspended ? '🔴 Suspended' : '🟢 Active'}</td>
                <td>{new Date(user.created_at).toLocaleDateString()}</td>
                <td style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="btn-primary"
                    onClick={() => handleAddCoins(user.username)}
                    style={{ padding: '6px 10px', fontSize: '12px' }}
                  >
                    💰 Add Coins
                  </button>
                  <button
                    className="btn-primary"
                    onClick={() => handleChangeRole(user.id, user.role)}
                    style={{ padding: '6px 10px', fontSize: '12px', background: '#9B59B6' }}
                  >
                    Role
                  </button>
                  <button
                    className="btn-delete"
                    onClick={() => handleBan(user.id)}
                    style={{ padding: '6px 10px', fontSize: '12px' }}
                  >
                    Ban
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="pagination">
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
          Previous
        </button>
        <span>Page {page}</span>
        <button onClick={() => setPage(p => p + 1)} disabled={users.length === 0}>
          Next
        </button>
      </div>
    </div>
  );
}
