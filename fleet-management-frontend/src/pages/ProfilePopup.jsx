// Komponenta za korisnički profil:
// - Email korisnika
// - Promjena lozinke
// - Postavke
// - Profilna slika
// - Brisanje profila
// - Odjava

import './AdminDashBoard.css';
import { useEffect, useState } from 'react';
import axios from 'axios';

const ProfilePopup = ({
  name,
  email,
  onLogout,
  onClose,
  apiBase = '/api/admin'
}) => {
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showSettingsSidebar, setShowSettingsSidebar] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');

  const [language] = useState('hr');
  const [profileImage, setProfileImage] = useState(null);

  /*
    VAŽNO:
    sessionStorage je odvojen za svaki tab.

    Tako administrator Maja i zaposlenik Ela mogu biti
    istovremeno prijavljeni u dva različita taba.
  */
  const sessionName = sessionStorage.getItem('name');
  const sessionEmail = sessionStorage.getItem('email');

  const currentName = sessionName || name || '';
  const currentEmail = sessionEmail || email || '';

  // PROMJENA LOZINKE
  const handlePasswordSave = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      alert('Molimo unesite sva polja.');
      return;
    }

    if (newPassword !== confirmPassword) {
      alert('Lozinke se ne podudaraju.');
      return;
    }

    try {
      const response = await axios.put(
        `${apiBase}/change-password`,
        {
          email: currentEmail,
          currentPassword,
          newPassword
        }
      );

      alert(
        response.data.message ||
        'Lozinka je uspješno promijenjena.'
      );

      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error(
        'Greška pri promjeni lozinke:',
        error
      );

      alert(
        error.response?.data?.message ||
        'Došlo je do greške.'
      );
    }
  };

  // DOHVAT PROFILNE SLIKE
  useEffect(() => {
    if (!currentEmail) return;

    axios
      .get(
        `${apiBase}/profile-image/${encodeURIComponent(
          currentEmail
        )}`
      )
      .then((res) => {
        setProfileImage(res.data.image);
      })
      .catch((err) => {
        console.log(
          'Nema slike za ovog korisnika ili greška:',
          err.message
        );

        setProfileImage(null);
      });
  }, [currentEmail, apiBase]);

  // UPLOAD PROFILNE SLIKE
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onloadend = async () => {
      const base64 = reader.result;

      try {
        await axios.post(
          `${apiBase}/profile-image`,
          {
            email: currentEmail,
            image: base64
          }
        );

        setProfileImage(base64);

        alert('Slika uspješno postavljena.');
      } catch (err) {
        console.error(
          'Greška kod spremanja slike:',
          err
        );

        alert(
          'Došlo je do greške pri spremanju slike.'
        );
      }
    };

    reader.readAsDataURL(file);
  };

  // BRISANJE PROFILA
  const handleDeleteProfile = async () => {
    const confirmDelete = window.confirm(
      'Jeste li sigurni da želite obrisati vaš profil?'
    );

    if (!confirmDelete) return;

    try {
      await axios.delete(
        `${apiBase}/delete-profile/${encodeURIComponent(
          currentEmail
        )}`
      );

      alert('Profil je uspješno obrisan.');

      /*
        Ne koristimo localStorage.clear()
        jer bi se tako mogli obrisati podaci drugog korisnika.
      */
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('userId');
      sessionStorage.removeItem('role');
      sessionStorage.removeItem('name');
      sessionStorage.removeItem('email');

      window.location.href = '/';
    } catch (error) {
      console.error(
        'Greška prilikom brisanja profila:',
        error
      );

      alert(
        error.response?.data?.message ||
        'Došlo je do greške pri brisanju profila.'
      );
    }
  };

  return (
    <div className="profil-popup">

      <button
        className="popup-close"
        onClick={onClose}
      >
        ✖
      </button>

      <p>
        <strong>{currentName}</strong>
      </p>

      <p
        style={{
          fontSize: '14px',
          color: '#888'
        }}
      >
        {currentEmail}
      </p>

      <button
        onClick={() => setShowPasswordModal(true)}
        className="btn-secondary"
      >
        Promjena lozinke
      </button>

      <button
        onClick={() => setShowSettingsSidebar(true)}
        className="btn-secondary"
      >
        Postavke
      </button>

      <button
        onClick={onLogout}
        className="btn-primary"
      >
        Odjava
      </button>

      {/* MODAL ZA PROMJENU LOZINKE */}
      {showPasswordModal && (
        <div className="modal-overlay">

          <div className="modal">

            <button
              className="popup-close"
              onClick={() =>
                setShowPasswordModal(false)
              }
            >
              ✖
            </button>

            <h3>Promjena lozinke</h3>

            <input
              type="password"
              placeholder="Trenutna lozinka"
              value={currentPassword}
              onChange={(e) =>
                setCurrentPassword(e.target.value)
              }
            />

            <input
              type="password"
              placeholder="Nova lozinka"
              value={newPassword}
              onChange={(e) =>
                setNewPassword(e.target.value)
              }
            />

            <input
              type="password"
              placeholder="Potvrdi lozinku"
              value={confirmPassword}
              onChange={(e) =>
                setConfirmPassword(e.target.value)
              }
            />

            <div className="modal-actions">

              <button
                onClick={handlePasswordSave}
              >
                Spremi
              </button>

              <button
                onClick={() =>
                  setShowPasswordModal(false)
                }
              >
                Odustani
              </button>

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
              onClick={() =>
                setShowSettingsSidebar(false)
              }
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
              <div className="settings-avatar-placeholder">
                Nema slike
              </div>
            )}

          </div>

          <div className="settings-details">

            <p>
              <strong>Ime:</strong>
              <span>{currentName}</span>
            </p>

            <p>
              <strong>Email:</strong>
              <span>{currentEmail}</span>
            </p>

            <p>
              <strong>Lozinka:</strong>
              <span>*********</span>
            </p>

            <p>
              <strong>Jezik:</strong>
              <span>{language.toUpperCase()}</span>
            </p>

          </div>

          <label className="settings-upload-label">

            Postavi sliku profila

            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              style={{
                display: 'none'
              }}
            />

          </label>

          <button
            className="settings-delete-btn"
            onClick={handleDeleteProfile}
          >
            Brisanje profila
          </button>

        </div>
      )}

    </div>
  );
};

export default ProfilePopup;