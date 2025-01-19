import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import PrivateRoute from './components/PrivateRoute';
import EmployeeDashboard from './pages/EmployeeDashboard'; 
import AdminDashboard from './pages/AdminDashBoard'; 
import Login from './pages/Login'; 
import Register from './pages/Register'; 
import './App.css'

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