import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Navbar from '../components/Navbar';

const EmployeeDashboard = () => {
  const [reservations, setReservations] = useState([]);
  const [newReservation, setNewReservation] = useState({
    vehicleType: '',
    startDate: '',
    endDate: '',
    purpose: '',
  });
  const [problemModal, setProblemModal] = useState({ isOpen: false, reservation: null });
  const [problemDescription, setProblemDescription] = useState('');
  const userId = localStorage.getItem('userId');
  const [errorModal, setErrorModal] = useState({ isOpen: false, message: '' });
  const [reservationModal, setReservationModal] = useState(false);
  
  //Reservation
  const fetchReservations = useCallback(async () => {
    try {
      const response = await axios.get(`/api/employee/reservations/${userId}`);
      setReservations(response.data);
    } catch (error) {
      console.error('Greška pri dohvaćanju rezervacija:', error.message);
    }
  }, [userId]);

  const createReservation = async (e) => {
    e.preventDefault();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startDate = new Date(newReservation.startDate);
    const endDate = new Date(newReservation.endDate);

    if (startDate < today) {
      alert('Početni datum vaše rezervacije ne može biti u prošlosti.');
      return;
    }

    if (startDate >= endDate) {
      alert('Krajnji datum mora biti nakon početnog datuma.');
      return;
    }

    try {
      const reservationData = { ...newReservation, employeeId: userId };
      await axios.post('/api/employee/reservations', reservationData);
      alert('Rezervacija uspješno kreirana!');
      setNewReservation({ vehicleType: '', startDate: '', endDate: '', purpose: '' });
      setReservationModal(false);
      fetchReservations();
    } catch (error) {
      console.error('Greška pri kreiranju rezervacije:', error.message);
    }
  };

  const cancelReservation = async (id) => {
    try {
      await axios.put(`/api/employee/reservations/${id}`, { status: 'cancelled by user' });
      alert('Rezervacija otkazana.');
      fetchReservations();
    } catch (error) {
      console.error('Greška pri otkazivanju rezervacije:', error.message);
    }
  };
  
  //Problem modal
  const openProblemModal = (reservation) => {
    if (reservation.status !== 'vehicle assigned') {
      setErrorModal({
        isOpen: true,
        message: 'Ne možete prijaviti problem jer vam rezervacija još nije odobrena niti dodijeljeno vozilo.',
      });
      return;
    }

    setProblemModal({
      isOpen: true,
      reservation,
    });
    setProblemDescription('');
  };

  const closeProblemModal = () => {
    setProblemModal({ isOpen: false, reservation: null });
  };

  const submitProblem = async () => {
    if (!problemDescription.trim()) {
      alert('Opis problema ne može biti prazan.');
      return;
    }

    try {
      const { reservation } = problemModal;
      await axios.post('/api/employee/report-problem', {
        reservationId: reservation._id,
        description: problemDescription,
      });

      alert('Problem uspješno prijavljen!');
      closeProblemModal();
      fetchReservations();
    } catch (error) {
      console.error('Greška tijekom prijavljivanja problema:', error.message);
      alert('Greška pri prijavi problema. Molimo pokušajte ponovo.');
    }
  };

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);


  return (
    <div className="employee-dashboard">
      <Navbar className="dashboard-navbar" />
      <div className="dashboard-container">
        <div className="content-left">
          <h2 className="dashboard-title">Dobrodošli !</h2>

          <button
            onClick={() => setReservationModal(true)}
            className="create-reservation-btn"
          >
            Kreiraj rezervaciju
          </button>

          {reservationModal && (
            <div className="modal-overlay">
              <div className="modal-content">
                <h3 className="modal-title">Napravi rezervaciju</h3>
                <form onSubmit={createReservation}>
                  <input
                    type="text"
                    placeholder="Tip vozila"
                    value={newReservation.vehicleType}
                    onChange={(e) => setNewReservation({ ...newReservation, vehicleType: e.target.value })}
                    required
                    className="input-field"
                  />
                  <input
                    type="date"
                    value={newReservation.startDate}
                    onChange={(e) => setNewReservation({ ...newReservation, startDate: e.target.value })}
                    required
                    className="input-field"
                  />
                  <input
                    type="date"
                    value={newReservation.endDate}
                    onChange={(e) => setNewReservation({ ...newReservation, endDate: e.target.value })}
                    required
                    className="input-field"
                  />
                  <textarea
                    placeholder="Svrha"
                    value={newReservation.purpose}
                    onChange={(e) => setNewReservation({ ...newReservation, purpose: e.target.value })}
                    required
                    className="textarea-field"
                  />
                  <div className="modal-buttons">
                    <button
                      type="button"
                      onClick={() => setReservationModal(false)}
                      className="close-modal-btn"
                    >
                      Zatvori
                    </button>
                    <button
                      type="submit"
                      className="submit-reservation-btn"
                    >
                      Podnesi rezervaciju
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
          <h3 className="reservations-title">Vaše rezervacije</h3>
          <div className="reservations-container">
            <ul className="reservations-list">
              {reservations.map((res) => (
                <li key={res._id} className="reservation-card">
                  <p>Tip vozila: {res.vehicleType}</p>
                  <p>
                    Datum: {new Date(res.startDate).toLocaleDateString()} -{' '}
                    {new Date(res.endDate).toLocaleDateString()}
                  </p>
                  <p>Status: {res.status}</p>
                  {new Date(res.startDate) > new Date() && res.status !== 'cancelled by user' && (
                    <button
                      onClick={() => cancelReservation(res._id)}
                      className="bg-red-500 text-white py-2 px-4 rounded mt-2"
                    >
                      Otkaži rezervaciju
                    </button>
                  )}
                  <button
                    onClick={() => openProblemModal(res)}
                    className="bg-yellow-500 text-white py-2 px-4 rounded mt-2"
                  >
                    Prijavi problem
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="content-right">
          <div className="dashboard-image" />
        </div>
      </div>

      {errorModal.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <p style={{ fontSize: '1.2rem', marginBottom: '20px' }}>{errorModal.message}</p>
            <button
              onClick={() => setErrorModal({ isOpen: false, message: '' })}
              className="close-modal-btn"
            >
              Zatvori
            </button>
          </div>
        </div>
      )}

      {problemModal.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{ fontSize: '1.5rem', marginBottom: '10px', textAlign: 'center' }}>Prijavite problem</h2>
            <p style={{ marginBottom: '10px', textAlign: 'center' }}>
              Vozilo: {problemModal.reservation.assignedVehicle?.name || 'N/A'}
            </p>
            <p style={{ marginBottom: '20px', textAlign: 'center' }}>
              Datum: {new Date(problemModal.reservation.startDate).toLocaleDateString()} -{' '}
              {new Date(problemModal.reservation.endDate).toLocaleDateString()}
            </p>
            <textarea
              placeholder="Opišite problem..."
              value={problemDescription}
              onChange={(e) => setProblemDescription(e.target.value)}
              className="textarea-field"
            ></textarea>
            <div className="modal-buttons">
              <button
                onClick={submitProblem}
                className="submit-reservation-btn"
              >
                Pošalji
              </button>
              <button
                onClick={closeProblemModal}
                className="close-modal-btn"
              >
                Zatvori
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeDashboard;


