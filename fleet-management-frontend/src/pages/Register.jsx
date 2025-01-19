import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import logo from '../slike/digitalna-dalmacija-logo2.webp'; 

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: '',
  });
  const navigate = useNavigate();

  const validateEmail = (email) => {
    if (!email) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
  
    // Provjera ispunjenosti obaveznih polja
    if (!formData.name || !formData.email || !formData.password) {
      alert('Molimo ispunite sva polja.');
      return;
    }
  
    // Provjera valjanosti emaila
    if (!validateEmail(formData.email)) {
      alert('Neispravan email. Molimo unesite ispravan email.');
      return;
    }
  
    // Provjera duljine lozinke
    if (formData.password.length < 8) {
      alert('Lozinka mora sadržavati najmanje 8 znakova.');
      return;
    }
  
    // Provjera odabira uloge
    if (!formData.role || formData.role === "") {
      alert('Molimo odaberite ulogu.');
      return;
    }
  
    try {
      // Slanje podataka na backend
      await axios.post('/api/auth/register', formData, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
  
      alert('Registracija uspješna! Sada se možete prijaviti.');
      navigate('/'); // Preusmjeravanje na stranicu za prijavu
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.message === 'User already exists') {
        alert('Korisnik s ovim emailom već postoji.');
      } else {
        alert('Došlo je do pogreške tijekom registracije. Pokušajte ponovno.');
      }
    }
  };
  


  const handleLoginRedirect = () => {
    navigate('/');
  };

  return (
    <div className="login-container">
      <div className="login-form">
        <img src={logo} alt="Logo" />
        <h2>Registracija</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Ime"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <input
            type="email"
            placeholder="E-mail"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />
          <input
            type="password"
            placeholder="Lozinka"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required
          />
          <select
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            className="form-select"
            required
          >
            <option value="" disabled hidden>
              Odaberite ulogu
            </option>
            <option value="employee">Zaposlenik</option>
            <option value="admin">Administrator</option>
          </select>
          <button type="submit">Registriraj</button>
        </form>
        <div className="register-link" onClick={handleLoginRedirect}>
          Već imate račun? Prijavite se
        </div>
      </div>
      <div className="login-image"></div>
    </div>
  );
};

export default Register;
