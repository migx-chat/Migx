import { useState, useEffect } from 'react';
import { adminApi } from '../services/api';
import '../styles/CreateRoomModal.css';

export function Rooms() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', ownerId: '', creatorName: '' });
  const [users, setUsers] = useState([]);
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    loadRooms();
    loadUsers();
  }, [page]);

  const loadRooms = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminApi.getRooms(page);
      setRooms(data.rooms || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const data = await adminApi.getAllUsers();
      setUsers(data.users || []);
    } catch (err) {
      console.error('Error loading users:', err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this room?')) return;
    try {
      await adminApi.deleteRoom(id);
      loadRooms();
    } catch (err) {
      alert('Error deleting room: ' + err.message);
    }
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name.trim()) {
      setFormError('Room name is required');
      return;
    }
    if (formData.name.trim().length < 3) {
      setFormError('Room name must be at least 3 characters');
      return;
    }
    if (formData.name.trim().length > 50) {
      setFormError('Room name must not exceed 50 characters');
      return;
    }
    if (!formData.ownerId) {
      setFormError('Please select a room owner');
      return;
    }

    setFormLoading(true);
    try {
      const owner = users.find(u => u.id === parseInt(formData.ownerId));
      await adminApi.createRoom({
        name: formData.name.trim(),
        ownerId: parseInt(formData.ownerId),
        creatorName: owner.username,
        description: formData.description.trim(),
        category: 'general'
      });
      setShowCreateModal(false);
      setFormData({ name: '', description: '', ownerId: '', creatorName: '' });
      loadRooms();
      alert('Room created successfully!');
    } catch (err) {
      setFormError(err.message || 'Error creating room');
    } finally {
      setFormLoading(false);
    }
  };

  if (loading) return <div className="page">Loading...</div>;
  if (error) return <div className="page error">Error: {error}</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h2>Room Management</h2>
        <button 
          className="btn-create"
          onClick={() => setShowCreateModal(true)}
        >
          + Create Room
        </button>
      </div>

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create New Room</h3>
              <button 
                className="modal-close" 
                onClick={() => setShowCreateModal(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleCreateRoom}>
              {formError && <div className="form-error">{formError}</div>}
              
              <div className="form-group">
                <label>Room Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Enter room name"
                />
              </div>

              <div className="form-group">
                <label>Room Owner *</label>
                <select
                  value={formData.ownerId}
                  onChange={(e) => setFormData({...formData, ownerId: e.target.value})}
                >
                  <option value="">Select owner</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.username} (ID: {user.id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Enter room description (optional)"
                  rows="3"
                />
              </div>

              <div className="form-actions">
                <button 
                  type="button" 
                  className="btn-cancel"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-submit"
                  disabled={formLoading}
                >
                  {formLoading ? 'Creating...' : 'Create Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {rooms.length === 0 ? (
        <p>No rooms found</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Category</th>
              <th>Users</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rooms.map((room) => (
              <tr key={room.id}>
                <td>{room.id}</td>
                <td>{room.name}</td>
                <td>{room.category || 'general'}</td>
                <td>{room.user_count || 0}</td>
                <td>{new Date(room.created_at).toLocaleDateString()}</td>
                <td>
                  <button
                    className="btn-delete"
                    onClick={() => handleDelete(room.id)}
                  >
                    Delete
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
        <button onClick={() => setPage(p => p + 1)} disabled={rooms.length === 0}>
          Next
        </button>
      </div>
    </div>
  );
}
