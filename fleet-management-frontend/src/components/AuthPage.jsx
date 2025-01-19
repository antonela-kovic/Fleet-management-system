import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './components/Login'; 
import Register from './components/Register'; 
import EmployeeDashboard from './components/EmployeeDashboard'; 
import AdminDashboard from './components/AdminDashboard';
import PrivateRoute from './components/PrivateRoute'; // Zaštita ruta

const App = () => {
  return (
    <Router>
      <Routes>
        {/* Ruta za prijavu */}
        <Route path="/" element={<Login />} />

        {/* Ruta za registraciju */}
        <Route path="/register" element={<Register />} />

        {/* Zaštićena ruta za zaposlenike */}
        <Route
          path="/employee-dashboard"
          element={
            <PrivateRoute role="employee">
              <EmployeeDashboard />
            </PrivateRoute>
          }
        />

        {/* Zaštićena ruta za administratore */}
        <Route
          path="/admin-dashboard"
          element={
            <PrivateRoute role="admin">
              <AdminDashboard />
            </PrivateRoute>
          }
        />
      </Routes>
    </Router>
  );
};

export default App;
