import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Navbar from '../components/Navbar';

const AdminDashboard = () => {
  const [reservations, setReservations] = useState([]);
  const [issues, setIssues] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [newVehicle, setNewVehicle] = useState({ type: '', name: '', status: 'available' });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState({ reservations: false, issues: false, vehicles: false });
  const [notifications, setNotifications] = useState([]);
  
  // Handle and display error messages
  const handleError = (error) => {
    setMessage(`Greška se dodgodila: ${error.message}`);
    setTimeout(() => setMessage(''), 5000);
  };
  // Fetch all reservations
  // Wrap fetchReservations in useCallback
  const fetchReservations = useCallback(async () => {
    setLoading((prev) => ({ ...prev, reservations: true }));
    try {
      const response = await axios.get('/api/admin/reservations');
      setReservations(response.data);
    } catch (error) {
      handleError(error);
    } finally {
      setLoading((prev) => ({ ...prev, reservations: false }));
    }
  }, []);

  // Fetch all reported issues
  const fetchIssues = useCallback(async () => {
    setLoading((prev) => ({ ...prev, issues: true }));
    try {
      const response = await axios.get('/api/admin/issues');
      setIssues(
        response.data.map((issue) => ({
          ...issue,
          reservation: issue.reservation || {},
          reportedBy: issue.reportedBy || {},
        }))
      );
    } catch (error) {
      handleError(error);
    } finally {
      setLoading((prev) => ({ ...prev, issues: false }));
    }
  }, []);

  // Fetch all vehicles
  const fetchVehicles = useCallback(async () => {
    setLoading((prev) => ({ ...prev, vehicles: true }));
    try {
      const response = await axios.get('/api/admin/vehicles');
      setVehicles(response.data);
    } catch (error) {
      handleError(error);
    } finally {
      setLoading((prev) => ({ ...prev, vehicles: false }));
    }
  }, []);

  // Update reservation status
  const updateReservationStatus = async (id, status, vehicleId = null) => {
    try {
      await axios.put(`/api/admin/reservations/${id}`, { status, vehicleId });
      fetchReservations(); // Refresh reservations
      fetchVehicles(); // Refresh vehicles
    } catch (error) {
      handleError(error);
    }
    console.log('Ažuriranje rezervacije:', { id, status, vehicleId });
  };


  // Update issue status
  const updateIssueStatus = async (id, status) => {
    try {
      await axios.put(`/api/admin/issues/${id}`, { status });
      fetchIssues(); // Refresh issues
      fetchVehicles(); // Refresh vehicles
    } catch (error) {
      handleError(error);
    }
  };


  // Fetch notifications for vehicle inspections
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const today = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(today.getDate() + 7);

        const response = await axios.get('/api/admin/vehicles');
        const upcomingInspections = response.data.filter(
          (vehicle) =>
            new Date(vehicle.registrationExpiryDate) >= today &&
            new Date(vehicle.registrationExpiryDate) <= nextWeek
        );

        setNotifications(
          upcomingInspections.map(
            (vehicle) =>
              `Za tjedan dana trebate napraviti tehnički pregled za vozilo: ${vehicle.name} (${vehicle.type})`
          )
        );
      } catch (error) {
        console.error('Pogreška pri dohvaćanju obavjesti:', error.message);
      }
    };

    fetchNotifications();
  }, []);



  // Add a new vehicle
  const addVehicle = async (e) => {
    e.preventDefault();
    if (!newVehicle.type.trim() || !newVehicle.name.trim() || !newVehicle.registrationExpiryDate) {
      alert('Molimo unesite ispravne podatke o vozilu.');
      return;
    }

    try {
      await axios.post('/api/admin/vehicles', newVehicle);
      setMessage('Vozilo dodano uspješno!');
      setTimeout(() => setMessage(''), 5000);
      setNewVehicle({ type: '', name: '', status: 'available', registrationExpiryDate: '' });
      fetchVehicles();
    } catch (error) {
      handleError(error);
    }
  };


  // Delete a reservation
  const deleteReservation = async (id) => {
    try {
      await axios.delete(`/api/admin/reservations/${id}`);
      fetchReservations(); // Refresh reservations
      fetchVehicles(); // Refresh vehicles
    } catch (error) {
      handleError(error);
    }
  };

  const deleteIssue = async (id) => {
    try {
      await axios.delete(`/api/admin/issues/${id}`);
      fetchIssues(); // Refresh issues
      fetchVehicles(); // Refresh vehicles
    } catch (error) {
      handleError(error);
    }
  };
  
  

  useEffect(() => {
    fetchReservations();
    fetchIssues();
    fetchVehicles();
  }, [fetchReservations, fetchIssues, fetchVehicles]);

  return (
    <div className="admin-dashboard-background">
      <Navbar />
      <div className="admin-container">
        <h2 className="admin-title">Administrativna nadzorna ploča</h2>
        {message && (
          <div className="admin-alert">
            <p>{message}</p>
          </div>
        )}
        {/* Notifications Section */}
        {notifications.length > 0 && (
          <div className="admin-notifications">
            <h3 className="section-title">Obavijesti</h3>
            <ul className="admin-notification-list">
              {notifications.map((note, index) => (
                <li key={index}>{note}</li>
              ))}
            </ul>
          </div>
        )}
        {/* Reservations Section */}
        <h3 className="section-title">Rezervacije</h3>
        {loading.reservations ? (
          <p>Učitavanje rezervacija...</p>
        ) : (
          <div className="admin-cards-container">
            {reservations.map((res) => (
              <div key={res._id} className="admin-card">
                <p>Vrsta vozila: {res.vehicleType}</p>
                <p>
                  Termin: {new Date(res.startDate).toLocaleDateString()} -{' '}
                  {new Date(res.endDate).toLocaleDateString()}
                </p>
                <p>Status: {res.status}</p>
                {res.assignedVehicle ? (
                  <p>
                    Dodijeljeno vozilo: {res.assignedVehicle.type} ({res.assignedVehicle.name})
                  </p>
                ) : (
                  <p>Dodijeljeno vozilo: N/A</p>
                )}
                {res.status === 'pending' && (
                  <div className="admin-actions">
                    <button
                      onClick={() => updateReservationStatus(res._id, 'approved')}
                      className="admin-button accept-button"
                    >
                      Prihvatiti
                    </button>
                    <button
                      onClick={() => updateReservationStatus(res._id, 'rejected')}
                      className="admin-button reject-button"
                    >
                      Odbiti
                    </button>
                  </div>
                )}
                {res.status === 'approved' && (
                  <div className="admin-select">
                    <select
                      onChange={(e) =>
                        updateReservationStatus(res._id, 'vehicle assigned', e.target.value)
                      }
                      className="admin-dropdown"
                    >
                      <option value="">Odaberite vozilo</option>
                      {vehicles
                        .filter((vehicle) => vehicle.status === 'available')
                        .map((vehicle) => (
                          <option key={vehicle._id} value={vehicle._id}>
                            {vehicle.name} ({vehicle.type})
                          </option>
                        ))}
                    </select>
                  </div>
                )}
                <button
                  onClick={() => deleteReservation(res._id)}
                  className="admin-button delete-button"
                >
                  Izbriši rezervaciju
                </button>
              </div>
            ))}
          </div>
        )}
        {/* Issues Section */}
        <h3 className="section-title">Prijavljeni problemi</h3>
        {loading.issues ? (
          <p>Učitavanje popisa problema...</p>
        ) : (
          <div className="admin-cards-container">
            {issues.map((issue) => (
              <div key={issue._id} className="admin-card">
                <p><strong>Zaposlenik:</strong> {issue.reportedBy.name || 'N/A'}</p>
                <p>
                  <strong>Datum rezervacije:</strong>{' '}
                  {issue.reservation
                    ? `${new Date(issue.reservation.startDate).toLocaleDateString()} - ${new Date(issue.reservation.endDate).toLocaleDateString()}`
                    : 'N/A'}
                </p>
                <p>
                  <strong>Vozilo:</strong>{' '}
                  {issue.vehicleId ? `${issue.vehicleId.type} (${issue.vehicleId.name})` : 'N/A'}
                </p>
                <p><strong>Opis problema:</strong> {issue.description}</p>
                <p>
                  <strong>Status:</strong>{' '}
                  {issue.status === 'resolved'
                    ? 'Prihvaćeno'
                    : issue.status === 'rejected'
                    ? 'Odbijeno'
                    : 'Pending'}
                </p>
                <div className="admin-actions">
                  <button
                    onClick={() => updateIssueStatus(issue._id, 'resolved')}
                    className="admin-button accept-button"
                  >
                    Prihvatiti
                  </button>
                  <button
                    onClick={() => updateIssueStatus(issue._id, 'rejected')}
                    className="admin-button reject-button"
                  >
                    Odbiti
                  </button>
                  <button
                    onClick={() => deleteIssue(issue._id)}
                    className="admin-button delete-button"
                  >
                    Izbriši
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        {/* Vehicles Section */}
        <h3 className="section-title">Vozila</h3>
        {loading.vehicles ? (
          <p>Učitavanje popisa vozila...</p>
        ) : (
          <div className="admin-cards-container">
            {vehicles.map((vehicle) => (
              <li key={vehicle._id} className="admin-card">
                <p>Tip: {vehicle.type}</p>
                <p>Registracijska oznaka vozila: {vehicle.name}</p>
                <p>Status: {vehicle.status}</p>
                <p>Registrirano do: {new Date(vehicle.registrationExpiryDate).toLocaleDateString()}</p>
              </li>
            ))}
          </div>
        )}
        {/* Add Vehicle Section */}
        <h3 className="section-title">Dodaj novo vozilo</h3>
        <form onSubmit={addVehicle} className="admin-form">
          <input
            type="text"
            placeholder="Vrsta vozila"
            value={newVehicle.type}
            onChange={(e) => setNewVehicle({ ...newVehicle, type: e.target.value })}
            required
            className="admin-input"
          />
          <input
            type="text"
            placeholder="Registracijska oznaka vozila"
            value={newVehicle.name}
            onChange={(e) => setNewVehicle({ ...newVehicle, name: e.target.value })}
            required
            className="admin-input"
          />
          <input
            type="date"
            placeholder="Datum isteka registracije"
            value={newVehicle.registrationExpiryDate}
            onChange={(e) => setNewVehicle({ ...newVehicle, registrationExpiryDate: e.target.value })}
            required
            className="admin-input"
          />
          <button type="submit" className="admin-button submit-button">
            Dodaj vozilo
          </button>
        </form>
      </div>
    </div>
  );
}  

export default AdminDashboard;
