// Ova je nova komponenta koja obuhvaća sve što si tražila za profil:
// - Email korisnika
// - Promjena jezika
// - Promjena lozinke
// - Postavke (sa slidebarom)
// - Odjava

import './AdminDashBoard.css';
import { useEffect, useState } from 'react';
import axios from 'axios';


const ProfilePopup = ({ name, email, onLogout, onClose, apiBase = '/api/admin' }) => {
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showSettingsSidebar, setShowSettingsSidebar] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [language, setLanguage] = useState('hr');
  const [profileImage, setProfileImage] = useState(null);
  const [currentPassword, setCurrentPassword] = useState('');




  const handleLanguageChange = (lang) => {
    setLanguage(lang);
    setShowLanguageDropdown(false);
    // 👇 Ovdje možeš dodati stvarnu promjenu jezika
    alert(`Jezik postavljen na: ${lang}`);
  };

const handlePasswordSave = async () => {
  if (newPassword !== confirmPassword) {
    alert('Lozinke se ne podudaraju.');
    return;
  }

  try {
    const response = await axios.put(`${apiBase}/change-password`, {
      email,
      currentPassword,
      newPassword
    });

    alert(response.data.message || 'Lozinka je uspješno promijenjena.');
    setShowPasswordModal(false);
    setNewPassword('');
    setConfirmPassword('');
  } catch (error) {
    console.error('Greška pri promjeni lozinke:', error);
    alert(error.response?.data?.message || 'Došlo je do greške.');
  }
};




useEffect(() => {
  if (email) {
    axios.get(`${apiBase}/profile-image/${encodeURIComponent(email)}`)
      .then(res => {
        setProfileImage(res.data.image);
      })
      .catch(err => {
        console.log('Nema slike za ovog korisnika ili greška:', err.message);
      });
  }
}, [email, apiBase]);


// Upload slike
const handleImageUpload = (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onloadend = async () => {
    const base64 = reader.result;

    try {
      await axios.post(`${apiBase}/profile-image`, {
        email,
        image: base64
      });
      setProfileImage(base64); // odmah prikaži novu sliku
      alert('Slika uspješno postavljena.');
    } catch (err) {
      console.error('Greška kod spremanja slike:', err);
      alert('Došlo je do greške pri spremanju slike.');
    }
  };
  reader.readAsDataURL(file);
};

//Brisanje profila
const handleDeleteProfile = async () => {
  const confirmDelete = window.confirm('Jeste li sigurni da želite obrisati vaš profil?');

  if (!confirmDelete) return;

  try {
    await axios.delete(`${apiBase}/delete-profile/${encodeURIComponent(email)}`);
    
    alert('Profil je uspješno obrisan.');
    localStorage.clear(); // očisti lokalnu pohranu
    window.location.href = '/'; // ili '/login' ako imaš login rutu
  } catch (error) {
    console.error('Greška prilikom brisanja profila:', error);
    alert('Došlo je do greške pri brisanju profila.');
  }
};


  return (
    <div className="profil-popup">
      <button className="popup-close" onClick={onClose}>✖</button>
      <p><strong>{name}</strong></p>
      <p style={{ fontSize: '14px', color: '#888' }}>{email}</p>

      {/* <button onClick={() => setShowLanguageDropdown(prev => !prev)} className="btn-secondary">Promijeni jezik</button>
      {showLanguageDropdown && (
        <div className="language-dropdown">
          <button onClick={() => handleLanguageChange('hr')}>HRV</button>
          <button onClick={() => handleLanguageChange('en')}>ENG</button>
        </div>
      )} */}

      <button onClick={() => setShowPasswordModal(true)} className="btn-secondary">Promjena lozinke</button>
      <button onClick={() => setShowSettingsSidebar(true)} className="btn-secondary">Postavke</button>
      <button onClick={onLogout} className="btn-primary">Odjava</button>

      {/* MODAL ZA PROMJENU LOZINKE */}
      {showPasswordModal && (
        <div className="modal-overlay">
          <div className="modal">
            <button className="popup-close" onClick={() => setShowPasswordModal(false)}>✖</button>
            <h3>Promjena lozinke</h3>
            <input
  type="password"
  placeholder="Trenutna lozinka"
  value={currentPassword}
  onChange={(e) => setCurrentPassword(e.target.value)}
/>

            <input
              type="password"
              placeholder="Nova lozinka"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <input
              type="password"
              placeholder="Potvrdi lozinku"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <div className="modal-actions">
              <button onClick={handlePasswordSave}>Spremi</button>
              <button onClick={() => setShowPasswordModal(false)}>Odustani</button>
            </div>
          </div>
        </div>
      )}

      {/* SLIDEBAR POSTAVKE */}
      {showSettingsSidebar && (
        <div className="settings-sidebar">
          <div className="settings-sidebar-header">
            <h3>Postavke korisnika</h3>
            <button
              type="button"
              className="settings-close"
              onClick={() => setShowSettingsSidebar(false)}
              aria-label="Zatvori postavke"
            >
              ✖
            </button>
          </div>

          <div className="settings-avatar-wrap">
            {profileImage ? (
              <img
                src={profileImage}
                alt="Profilna slika"
                className="settings-avatar"
              />
            ) : (
              <div className="settings-avatar-placeholder">Nema slike</div>
            )}
          </div>

          <div className="settings-details">
            <p><strong>Ime:</strong><span>{name}</span></p>
            <p><strong>Email:</strong><span>{email}</span></p>
            <p><strong>Lozinka:</strong><span>*********</span></p>
            <p><strong>Jezik:</strong><span>{language.toUpperCase()}</span></p>
          </div>

          <label className="settings-upload-label">
            Postavi sliku profila
            <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
          </label>

          <button className="settings-delete-btn" onClick={handleDeleteProfile}>
            Brisanje profila
          </button>
        </div>
      )}
    </div>
  );
};

export default ProfilePopup;
