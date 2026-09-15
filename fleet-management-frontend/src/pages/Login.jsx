import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import logo from '../slike/digitalna-dalmacija-logo2.webp';
import './Login.css';


// const decodeJWT = (token) => {
//   try {
//     const base64Url = token.split('.')[1];
//     const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
//     const jsonPayload = decodeURIComponent(
//       atob(base64)
//         .split('')
//         .map((c) => `%${('00' + c.charCodeAt(0).toString(16)).slice(-2)}`)
//         .join('')
//     );
//     return JSON.parse(jsonPayload);
//   } catch (error) {
//     console.error('Greška prilikom dekodiranja tokena:', error);
//     return null;
//   }
// };

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
  e.preventDefault();
  try {
    const response = await axios.post('/api/auth/login', { email, password }, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const { token, userId, role, name } = response.data;
    if (token && userId && role && name) {
      localStorage.setItem('token', token);
      localStorage.setItem('userId', userId);
      localStorage.setItem('role', role);
      localStorage.setItem('name', name);
      localStorage.setItem('email', email);


      if (role === 'employee') {
        navigate('/employee-dashboard');
      } else if (role === 'admin') {
        navigate('/admin-dashboard');
      }
    } else {
      alert('Prijava nije uspjela: Nedostaju podaci u odgovoru.');
    }
  } catch (error) {
    console.error('Greška prilikom prijave:', error.response?.data || error.message);
    alert('Prijava nije uspjela. Provjerite svoje podatke i pokušajte ponovno.');
  }
};


const handleRegisterRedirect = () => {
  navigate('/register');
};

return (
  <div className="login-container">
    <div className="login-form">
      <img src={logo} alt="Logo" />
      <h2>Dobro došli!</h2>
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
          placeholder="Lozinka"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">Prijava</button>
      </form>
      <div className="register-link" onClick={handleRegisterRedirect}>
        Nemate račun? Registrirajte se
      </div>
    </div>
    <div className="login-image"></div>
  </div>

);
};

export default Login;
