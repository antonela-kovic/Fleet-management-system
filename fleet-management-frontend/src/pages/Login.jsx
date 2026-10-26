import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { saveSession, errorMessage } from '../services/api';
import logo from '../assets/logo-full.webp';
import './Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const { data } = await api.post('/auth/login', { email, password });
      saveSession(data);
      navigate(data.role === 'admin' ? '/admin-dashboard' : '/employee-dashboard');
    } catch (err) {
      setError(errorMessage(err, 'Login failed. Check your details and try again.'));
    }
  };

  return (
    <div className="login-container">
      <div className="login-form">
        <img src={logo} alt="Logo" />
        <h2>Welcome!</h2>
        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="form-error">{error}</p>}
          <button type="submit">Log in</button>
        </form>
        <div className="register-link" onClick={() => navigate('/register')}>
          No account yet? Register
        </div>
      </div>
      <div className="login-image"></div>
    </div>
  );
};

export default Login;
