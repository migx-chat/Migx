// Use relative path in production (served from /admin/)
// Use .env variable in development
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export const apiCall = async (endpoint, options = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const token = localStorage.getItem('adminToken');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `HTTP ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

export const adminApi = {
  // Reports
  getReports: (page = 1) => apiCall(`/api/admin/reports?page=${page}`),
  getReportDetail: (id) => apiCall(`/api/admin/reports/${id}`),
  updateReportStatus: (id, status) =>
    apiCall(`/api/admin/reports/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  deleteReport: (id) =>
    apiCall(`/api/admin/reports/${id}`, { method: 'DELETE' }),

  // Users
  getUsers: (page = 1, role = null) => {
    const query = new URLSearchParams();
    query.append('page', page);
    if (role) query.append('role', role);
    return apiCall(`/api/admin/users?${query}`);
  },
  getUserDetail: (id) => apiCall(`/api/users/${id}`),
  updateUserRole: (id, role) =>
    apiCall(`/api/admin/users/${id}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),
  banUser: (id) =>
    apiCall(`/api/admin/users/${id}/ban`, { method: 'PATCH' }),
  unbanUser: (id) =>
    apiCall(`/api/admin/users/${id}/unban`, { method: 'PATCH' }),

  // Rooms
  getRooms: (page = 1) => apiCall(`/api/rooms?page=${page}`),
  getRoomDetail: (id) => apiCall(`/api/rooms/${id}`),
  deleteRoom: (id) =>
    apiCall(`/api/rooms/${id}`, { method: 'DELETE' }),
  createRoom: (roomData) =>
    apiCall('/api/rooms/create', {
      method: 'POST',
      body: JSON.stringify(roomData),
    }),
  getAllUsers: () => apiCall('/api/admin/users?page=1&limit=1000'),

  // Analytics
  getStats: () => apiCall('/api/admin/stats'),
  getActiveUsers: () => apiCall('/api/admin/users/active'),
  getPendingReports: () => apiCall('/api/admin/reports/pending'),

  // Auth
  login: (username, password) =>
    apiCall('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
};
