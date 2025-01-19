//--Navbar.jsx--
import { useNavigate } from 'react-router-dom';

const Navbar = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token'); // Uklanja token iz localStorage-a
    localStorage.removeItem('userId'); // Uklanja korisnički ID
    localStorage.removeItem('role'); // Uklanja ulogu korisnika
    navigate('/'); // Preusmjeravanje na početnu stranicu
  };

  return (
    <nav className="nav-main">
      <h1 className='text-title'>Upravljanje voznim parkom</h1>
      <button
        onClick={handleLogout}
        className="nav-logout"
      >
        Odjava
      </button>
    </nav>
  );
};

export default Navbar;
