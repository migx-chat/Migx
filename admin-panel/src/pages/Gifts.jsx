import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import '../styles/ManagementPages.css';

const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL || ''}/api`;

export default function Gifts() {
  const [gifts, setGifts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [cloudinaryUrl, setCloudinaryUrl] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    image_url: ''
  });

  // Load gifts on mount
  useEffect(() => {
    loadGifts();
  }, []);

  const loadGifts = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/gifts`);
      setGifts(response.data.gifts || []);
      setError('');
    } catch (err) {
      console.error('Error loading gifts:', err);
      setError('Failed to load gifts');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      setError('Only PNG and JPG images are allowed');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB');
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target.result);
    };
    reader.readAsDataURL(file);

    // Upload to Cloudinary
    await uploadToCloudinary(file);
  };

  const uploadToCloudinary = async (file) => {
    try {
      setUploading(true);
      const formDataObj = new FormData();
      formDataObj.append('file', file);

      const response = await axios.post(
        `${API_BASE_URL}/upload/gifts`,
        formDataObj,
        {
          headers: { 'Content-Type': 'multipart/form-data' }
        }
      );

      if (response.data.success) {
        const imageUrl = response.data.url;
        setCloudinaryUrl(imageUrl);
        setFormData(prev => ({
          ...prev,
          image_url: imageUrl
        }));
        setError('');
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.response?.data?.error || 'Failed to upload image');
      setImagePreview(null);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.price) {
      setError('Name and price are required');
      return;
    }

    const price = parseInt(formData.price);
    if (isNaN(price) || price < 0) {
      setError('Price must be a non-negative number');
      return;
    }

    try {
      setLoading(true);
      const method = editingId ? 'put' : 'post';
      const url = editingId 
        ? `${API_BASE_URL}/gifts/${editingId}`
        : `${API_BASE_URL}/gifts/create`;

      const response = await axios[method](url, {
        name: formData.name.trim(),
        price,
        image_url: formData.image_url || null
      });

      if (response.data.success) {
        await loadGifts();
        setShowModal(false);
        setFormData({ name: '', price: '', image_url: '' });
        setImagePreview(null);
        setCloudinaryUrl('');
        setEditingId(null);
        setError('');
      }
    } catch (err) {
      console.error('Error saving gift:', err);
      setError(err.response?.data?.error || 'Failed to save gift');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (gift) => {
    setFormData({
      name: gift.name,
      price: gift.price.toString(),
      image_url: gift.image_url || ''
    });
    setImagePreview(gift.image_url);
    setCloudinaryUrl(gift.image_url);
    setEditingId(gift.id);
    setShowModal(true);
    setError('');
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this gift?')) return;

    try {
      setLoading(true);
      const response = await axios.delete(`${API_BASE_URL}/gifts/${id}`);
      if (response.data.success) {
        await loadGifts();
        setError('');
      }
    } catch (err) {
      console.error('Error deleting gift:', err);
      setError(err.response?.data?.error || 'Failed to delete gift');
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setFormData({ name: '', price: '', image_url: '' });
    setImagePreview(null);
    setCloudinaryUrl('');
    setEditingId(null);
    setError('');
  };

  return (
    <div className="management-page gifts-page">
      <div className="page-header">
        <h1>💝 Gift Management</h1>
        <button 
          className="btn btn-primary"
          onClick={() => setShowModal(true)}
          disabled={loading}
        >
          + Create Gift
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="gifts-grid">
        {loading && gifts.length === 0 ? (
          <div className="loading">Loading gifts...</div>
        ) : gifts.length === 0 ? (
          <div className="empty-state">No gifts yet. Create your first gift!</div>
        ) : (
          gifts.map(gift => (
            <div key={gift.id} className="gift-card">
              {gift.image_url && (
                <div className="gift-image-wrapper">
                  <img 
                    src={gift.image_url} 
                    alt={gift.name}
                    className="gift-image"
                  />
                </div>
              )}
              <div className="gift-info">
                <h3>{gift.name}</h3>
                <p className="gift-price">💰 {gift.price} Credits</p>
              </div>
              <div className="gift-actions">
                <button 
                  className="btn btn-sm btn-secondary"
                  onClick={() => handleEdit(gift)}
                  disabled={loading}
                >
                  Edit
                </button>
                <button 
                  className="btn btn-sm btn-danger"
                  onClick={() => handleDelete(gift.id)}
                  disabled={loading}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? 'Edit Gift' : 'Create New Gift'}</h2>
              <button className="close-btn" onClick={closeModal}>×</button>
            </div>

            <form onSubmit={handleSubmit} className="gift-form">
              <div className="form-group">
                <label>Gift Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g., Diamond Ring, Gold Watch"
                  maxLength="100"
                  required
                />
              </div>

              <div className="form-group">
                <label>Price (Credits) *</label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  placeholder="0"
                  min="0"
                  required
                />
              </div>

              <div className="form-group">
                <label>Gift Image (PNG/JPG)</label>
                <div className="image-upload-wrapper">
                  {imagePreview && (
                    <div className="image-preview">
                      <img src={imagePreview} alt="Preview" />
                      <button 
                        type="button"
                        className="remove-image-btn"
                        onClick={() => {
                          setImagePreview(null);
                          setCloudinaryUrl('');
                          setFormData(prev => ({ ...prev, image_url: '' }));
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                      >
                        ✕ Remove
                      </button>
                    </div>
                  )}
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? 'Uploading...' : 'Choose Image'}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={handleImageSelect}
                    style={{ display: 'none' }}
                  />
                  <p className="form-help">PNG or JPG, max 5MB. Will be uploaded to Cloudinary.</p>
                </div>
              </div>

              {error && <div className="form-error">{error}</div>}

              <div className="form-actions">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={closeModal}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={loading || uploading}
                >
                  {loading ? 'Saving...' : 'Save Gift'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
