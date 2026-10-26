import { Navigate } from 'react-router-dom';
import PropTypes from 'prop-types';

// Client-side guard for the dashboards. The backend checks the token and the
// role again on every API call, so this only controls navigation.
const PrivateRoute = ({ children, role }) => {
  const token = sessionStorage.getItem('token');
  const userRole = sessionStorage.getItem('role');

  if (!token || (role && userRole !== role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

PrivateRoute.propTypes = {
  children: PropTypes.node.isRequired,
  role: PropTypes.oneOf(['admin', 'employee']),
};

export default PrivateRoute;
