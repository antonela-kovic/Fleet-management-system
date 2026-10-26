import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { errorMessage } from '../services/api';
import logo from '../assets/logo-full.webp';
import './Register.css';

// Registration creates an employee account. Admin accounts are created on the
// server with `npm run create-admin`.
const Register = () => {
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const update = (field) => (e) => setFormData({ ...formData, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    try {
      await api.post('/auth/register', formData);
      alert('Registration successful. You can now log in.');
      navigate('/');
    } catch (err) {
      setError(errorMessage(err, 'Registration failed. Please try again.'));
    }
  };

  return (
    <div className="login-container">
      <div className="login-form">
        <img src={logo} alt="Logo" />
        <h2>Register</h2>
        <form onSubmit={handleSubmit}>
          <input type="text" placeholder="Name" value={formData.name} onChange={update('name')} required />
          <input type="email" placeholder="Email" value={formData.email} onChange={update('email')} required />
          <input
            type="password"
            placeholder="Password (min. 8 characters)"
            value={formData.password}
            onChange={update('password')}
            required
          />
          {error && <p className="form-error">{error}</p>}
          <button type="submit">Register</button>
        </form>
        <div className="register-link" onClick={() => navigate('/')}>
          Already have an account? Log in
        </div>
      </div>
      <div className="login-image"></div>
    </div>
  );
};

export default Register;
