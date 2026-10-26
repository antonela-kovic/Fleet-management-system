// User profile popup (both roles): name and email, password change,
// profile picture, account deletion and logout.
import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import api, { errorMessage, logout } from '../services/api';
import './AdminDashboard.css';

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

const ProfilePopup = ({ name, email, onLogout, onClose }) => {
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showSettingsSidebar, setShowSettingsSidebar] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileImage, setProfileImage] = useState(null);

  // Load the profile picture of the logged-in user
  useEffect(() => {
    api
      .get('/profile/image')
      .then((res) => setProfileImage(res.data.image))
      .catch(() => setProfileImage(null)); // 404 = no picture yet
  }, []);

  const closePasswordModal = () => {
    setShowPasswordModal(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handlePasswordSave = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      alert('Please fill in all fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      alert('The new passwords do not match.');
      return;
    }

    try {
      const { data } = await api.put('/profile/password', { currentPassword, newPassword });
      alert(data.message);
      closePasswordModal();
    } catch (error) {
      alert(errorMessage(error, 'Changing the password failed.'));
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_IMAGE_BYTES) {
      alert('The image must be smaller than 2 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        await api.put('/profile/image', { image: reader.result });
        setProfileImage(reader.result);
      } catch (error) {
        alert(errorMessage(error, 'Saving the image failed.'));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteProfile = async () => {
    if (!window.confirm('Are you sure you want to delete your profile? This cannot be undone.')) return;

    try {
      await api.delete('/profile');
      alert('Your profile has been deleted.');
      logout();
    } catch (error) {
      alert(errorMessage(error, 'Deleting the profile failed.'));
    }
  };

  return (
    <div className="profile-popup">
      <button className="popup-close" onClick={onClose} aria-label="Close">✖</button>

      <p><strong>{name}</strong></p>
      <p className="profile-email">{email}</p>

      <button onClick={() => setShowPasswordModal(true)} className="btn-secondary">Change password</button>
      <button onClick={() => setShowSettingsSidebar(true)} className="btn-secondary">Settings</button>
      <button onClick={onLogout} className="btn-primary">Log out</button>

      {showPasswordModal && (
        <div className="modal-overlay">
          <div className="modal">
            <button className="popup-close" onClick={closePasswordModal} aria-label="Close">✖</button>
            <h3>Change password</h3>
            <input
              type="password"
              placeholder="Current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
            <input
              type="password"
              placeholder="New password (min. 8 characters)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <div className="modal-actions">
              <button onClick={handlePasswordSave}>Save</button>
              <button onClick={closePasswordModal}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showSettingsSidebar && (
        <div className="settings-sidebar">
          <div className="settings-sidebar-header">
            <h3>User settings</h3>
            <button
              type="button"
              className="settings-close"
              onClick={() => setShowSettingsSidebar(false)}
              aria-label="Close settings"
            >
              ✖
            </button>
          </div>

          <div className="settings-avatar-wrap">
            {profileImage ? (
              <img src={profileImage} alt="Profile picture" className="settings-avatar" />
            ) : (
              <div className="settings-avatar-placeholder">No picture</div>
            )}
          </div>

          <div className="settings-details">
            <p><strong>Name:</strong><span>{name}</span></p>
            <p><strong>Email:</strong><span>{email}</span></p>
            <p><strong>Password:</strong><span>*********</span></p>
          </div>

          <label className="settings-upload-label">
            Upload profile picture
            <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
          </label>

          <button className="settings-delete-btn" onClick={handleDeleteProfile}>Delete profile</button>
        </div>
      )}
    </div>
  );
};

ProfilePopup.propTypes = {
  name: PropTypes.string.isRequired,
  email: PropTypes.string.isRequired,
  onLogout: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default ProfilePopup;
