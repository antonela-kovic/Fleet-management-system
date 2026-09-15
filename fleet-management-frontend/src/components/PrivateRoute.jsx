import { Navigate } from 'react-router-dom';
import PropTypes from 'prop-types'; // Dodan PropTypes za validaciju

const PrivateRoute = ({ children, role }) => {
  const token = sessionStorage.getItem('token');
  const userRole = sessionStorage.getItem('role');

  // Provjerava je li korisnik prijavljen i ima li odgovarajuću ulogu
  if (!token || (role && userRole !== role)) {
    return <Navigate to="/" />;
  }

  return children;
};

// Validacija props-a
PrivateRoute.propTypes = {
  children: PropTypes.node.isRequired, // Obavezno React čvor
  role: PropTypes.string, // Opcionalni string
};

export default PrivateRoute;
