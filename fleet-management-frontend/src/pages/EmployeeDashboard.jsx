import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './EmployeeDashboard.css';
import ProfilePopup from './ProfilePopup';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faMoon, faSun } from '@fortawesome/free-solid-svg-icons';

const statusLabels = {
  pending: 'Na čekanju',
  approved: 'Odobreno',
  rejected: 'Odbijeno',
  'vehicle assigned': 'Vozilo dodijeljeno',
  'cancelled by user': 'Otkazano',
  canceled: 'Otkazano',
  expired: 'Završeno',
};

const statusClass = (status) => {
  if (status === 'vehicle assigned' || status === 'approved') return 'employee-status-success';
  if (status === 'rejected' || status === 'cancelled by user' || status === 'canceled') return 'employee-status-danger';
  if (status === 'expired') return 'employee-status-muted';
  return 'employee-status-pending';
};

const formatDate = (value) => {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('hr-HR');
};

const EmployeeDashboard = () => {
  const userId = sessionStorage.getItem('userId');
  const employeeName = sessionStorage.getItem('name') || 'zaposleniče';
  const employeeEmail = sessionStorage.getItem('email') || '';

  const [activeTab, setActiveTab] = useState('pregled');
  const [darkMode, setDarkMode] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [problemModal, setProblemModal] = useState({ isOpen: false, reservation: null });
  const [problemDescription, setProblemDescription] = useState('');
  const [errorModal, setErrorModal] = useState({ isOpen: false, message: '' });
  const [newReservation, setNewReservation] = useState({
    vehicleType: '',
    startDate: '',
    endDate: '',
    purpose: '',
  });

  const fetchReservations = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const response = await axios.get(`/api/employee/reservations/${userId}`);
      const sorted = [...response.data].sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
      setReservations(sorted);
    } catch (error) {
      console.error('Greška pri dohvaćanju rezervacija:', error.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  const todayString = new Date().toISOString().split('T')[0];

  const createReservation = async (e) => {
    e.preventDefault();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startDate = new Date(newReservation.startDate);
    const endDate = new Date(newReservation.endDate);

    if (startDate < today) {
      setErrorModal({ isOpen: true, message: 'Početni datum rezervacije ne može biti u prošlosti.' });
      return;
    }

    if (startDate >= endDate) {
      setErrorModal({ isOpen: true, message: 'Krajnji datum mora biti nakon početnog datuma.' });
      return;
    }

    try {
      const reservationData = { ...newReservation, employeeId: userId };
      await axios.post('/api/employee/reservations', reservationData);
      setNewReservation({ vehicleType: '', startDate: '', endDate: '', purpose: '' });
      await fetchReservations();
      setActiveTab('rezervacije');
    } catch (error) {
      console.error('Greška pri kreiranju rezervacije:', error.message);
      setErrorModal({
        isOpen: true,
        message: error.response?.data?.message || 'Rezervaciju nije moguće kreirati. Pokušajte ponovno.',
      });
    }
  };

  const cancelReservation = async (reservation) => {
    const start = new Date(reservation.startDate);
    if (new Date() >= start) {
      setErrorModal({ isOpen: true, message: 'Rezervaciju nije moguće otkazati nakon početka termina.' });
      return;
    }

    if (!window.confirm('Jeste li sigurni da želite otkazati ovu rezervaciju?')) return;

    try {
      await axios.put(`/api/employee/reservations/${reservation._id}`, { status: 'cancelled by user' });
      await fetchReservations();
    } catch (error) {
      console.error('Greška pri otkazivanju rezervacije:', error.message);
      setErrorModal({
        isOpen: true,
        message: error.response?.data?.message || 'Otkazivanje rezervacije nije uspjelo.',
      });
    }
  };

  const openProblemModal = (reservation) => {
    if (reservation.status !== 'vehicle assigned') {
      setErrorModal({
        isOpen: true,
        message: 'Problem možete prijaviti tek kada administrator odobri rezervaciju i dodijeli vam vozilo.',
      });
      return;
    }

    setProblemModal({ isOpen: true, reservation });
    setProblemDescription('');
  };

  const closeProblemModal = () => {
    setProblemModal({ isOpen: false, reservation: null });
    setProblemDescription('');
  };

  const submitProblem = async () => {
    if (!problemDescription.trim()) {
      setErrorModal({ isOpen: true, message: 'Opis problema ne može biti prazan.' });
      return;
    }

    try {
      await axios.post('/api/employee/report-problem', {
        reservationId: problemModal.reservation._id,
        description: problemDescription.trim(),
      });
      closeProblemModal();
    } catch (error) {
      console.error('Greška tijekom prijavljivanja problema:', error.message);
      setErrorModal({
        isOpen: true,
        message: error.response?.data?.message || 'Prijava problema nije uspjela. Pokušajte ponovno.',
      });
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('userId');
    sessionStorage.removeItem('role');
    sessionStorage.removeItem('name');
    sessionStorage.removeItem('email');
    window.location.href = '/';
  };

  const activeReservations = useMemo(
    () => reservations.filter((r) => ['pending', 'approved', 'vehicle assigned'].includes(r.status)),
    [reservations]
  );

  const assignedReservations = useMemo(
    () => reservations.filter((r) => r.status === 'vehicle assigned'),
    [reservations]
  );

  const upcomingReservations = useMemo(
    () => reservations.filter((r) => new Date(r.endDate) >= new Date() && !['rejected', 'cancelled by user', 'canceled'].includes(r.status)),
    [reservations]
  );

  const reservationForDate = (date) => {
    const day = new Date(date);
    day.setHours(12, 0, 0, 0);

    return reservations.filter((reservation) => {
      const start = new Date(reservation.startDate);
      const end = new Date(reservation.endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return day >= start && day <= end;
    });
  };

  const renderReservationTable = (items = reservations) => (
    <div className="employee-table-wrap">
      <table className="employee-reservations-table">
        <thead>
          <tr>
            <th>Termin</th>
            <th>Tip vozila</th>
            <th>Svrha</th>
            <th>Dodijeljeno vozilo</th>
            <th>Status</th>
            <th>Akcije</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan="6" className="employee-empty-cell">Nema rezervacija za prikaz.</td>
            </tr>
          ) : (
            items.map((reservation) => {
              const canCancel = new Date(reservation.startDate) > new Date()
                && !['cancelled by user', 'canceled', 'rejected', 'expired'].includes(reservation.status);

              return (
                <tr key={reservation._id}>
                  <td>{formatDate(reservation.startDate)} – {formatDate(reservation.endDate)}</td>
                  <td>{reservation.vehicleType || '—'}</td>
                  <td>{reservation.purpose || '—'}</td>
                  <td>
                    {reservation.assignedVehicle
                      ? `${reservation.assignedVehicle.name} (${reservation.assignedVehicle.type})`
                      : 'Nije dodijeljeno'}
                  </td>
                  <td>
                    <span className={`employee-status ${statusClass(reservation.status)}`}>
                      {statusLabels[reservation.status] || reservation.status}
                    </span>
                  </td>
                  <td>
                    <div className="employee-row-actions">
                      {canCancel && (
                        <button
                          type="button"
                          className="employee-btn employee-btn-danger-outline"
                          onClick={() => cancelReservation(reservation)}
                        >
                          Otkaži
                        </button>
                      )}
                      <button
                        type="button"
                        className="employee-btn employee-btn-secondary"
                        onClick={() => openProblemModal(reservation)}
                      >
                        Prijavi problem
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );

  const renderContent = () => {
    if (activeTab === 'rezervacije') {
      return (
        <section className="employee-section">
          <div className="employee-section-heading">
            <div>
              <h2>Moje rezervacije</h2>
              <p>Pregled svih aktivnih i prethodnih zahtjeva te njihovih statusa.</p>
            </div>
            <button className="employee-btn employee-btn-primary" onClick={() => setActiveTab('nova-rezervacija')}>
              Nova rezervacija
            </button>
          </div>
          {loading ? <div className="employee-loading">Učitavanje rezervacija...</div> : renderReservationTable()}
        </section>
      );
    }

    if (activeTab === 'nova-rezervacija') {
      return (
        <section className="employee-section employee-form-section">
          <div className="employee-section-heading">
            <div>
              <h2>Nova rezervacija</h2>
              <p>Unesite željeni termin, tip vozila i svrhu korištenja.</p>
            </div>
          </div>

          <form className="employee-reservation-form" onSubmit={createReservation}>
            <div className="employee-form-grid">
              <label>
                Preferirani tip vozila
                <input
                  type="text"
                  placeholder="npr. osobni automobil, kombi"
                  value={newReservation.vehicleType}
                  onChange={(e) => setNewReservation({ ...newReservation, vehicleType: e.target.value })}
                  required
                />
              </label>
              <label>
                Početni datum
                <input
                  type="date"
                  min={todayString}
                  value={newReservation.startDate}
                  onChange={(e) => setNewReservation({ ...newReservation, startDate: e.target.value })}
                  required
                />
              </label>
              <label>
                Završni datum
                <input
                  type="date"
                  min={newReservation.startDate || todayString}
                  value={newReservation.endDate}
                  onChange={(e) => setNewReservation({ ...newReservation, endDate: e.target.value })}
                  required
                />
              </label>
              <label className="employee-form-purpose">
                Svrha putovanja
                <textarea
                  placeholder="Kratko opišite razlog korištenja službenog vozila..."
                  value={newReservation.purpose}
                  onChange={(e) => setNewReservation({ ...newReservation, purpose: e.target.value })}
                  required
                />
              </label>
            </div>
            <div className="employee-form-actions">
              <button type="button" className="employee-btn employee-btn-secondary" onClick={() => setActiveTab('rezervacije')}>
                Odustani
              </button>
              <button type="submit" className="employee-btn employee-btn-primary">
                Pošalji zahtjev
              </button>
            </div>
          </form>
        </section>
      );
    }

    if (activeTab === 'problemi') {
      return (
        <section className="employee-section">
          <div className="employee-section-heading">
            <div>
              <h2>Prijava problema ili štete</h2>
              <p>Problem se može prijaviti za rezervaciju kojoj je administrator već dodijelio vozilo.</p>
            </div>
          </div>

          <div className="employee-problem-grid">
            {assignedReservations.length === 0 ? (
              <div className="employee-empty-state">
                <strong>Trenutno nemate rezervaciju s dodijeljenim vozilom.</strong>
                <span>Kada administrator dodijeli vozilo, ovdje će se pojaviti mogućnost prijave problema.</span>
              </div>
            ) : (
              assignedReservations.map((reservation) => (
                <article className="employee-problem-card" key={reservation._id}>
                  <div>
                    <span className="employee-card-label">Vozilo</span>
                    <h3>
                      {reservation.assignedVehicle
                        ? `${reservation.assignedVehicle.name} (${reservation.assignedVehicle.type})`
                        : 'Vozilo nije dodijeljeno'}
                    </h3>
                    <p>{formatDate(reservation.startDate)} – {formatDate(reservation.endDate)}</p>
                  </div>
                  <button className="employee-btn employee-btn-primary" onClick={() => openProblemModal(reservation)}>
                    Prijavi problem
                  </button>
                </article>
              ))
            )}
          </div>
        </section>
      );
    }

    if (activeTab === 'kalendar') {
      const selectedReservations = reservationForDate(selectedDate);

      return (
        <section className="employee-section employee-calendar-section">
          <div className="employee-calendar-layout">
            <div className="employee-calendar-card">
              <Calendar
                locale="hr-HR"
                value={selectedDate}
                onChange={setSelectedDate}
                calendarType="iso8601"
                tileClassName={({ date, view }) => {
                  if (view !== 'month') return null;
                  return reservationForDate(date).length > 0 ? 'employee-has-reservation' : null;
                }}
                formatShortWeekday={(locale, date) =>
                  date.toLocaleDateString('hr-HR', { weekday: 'short' }).replace('.', '')
                }
              />
            </div>

            <aside className="employee-calendar-sidebar">
              <div className="employee-info-card">
                <span className="employee-card-label">Odabrani datum</span>
                <h3>{selectedDate.toLocaleDateString('hr-HR')}</h3>
              </div>
              <div className="employee-info-card">
                <span className="employee-card-label">Rezervacije toga dana</span>
                {selectedReservations.length === 0 ? (
                  <p>Nema rezervacija.</p>
                ) : (
                  selectedReservations.map((reservation) => (
                    <div className="employee-calendar-item" key={reservation._id}>
                      <strong>{reservation.vehicleType || 'Vozilo'}</strong>
                      <span>{statusLabels[reservation.status] || reservation.status}</span>
                    </div>
                  ))
                )}
              </div>
              <div className="employee-info-card">
                <span className="employee-card-label">Legenda</span>
                <p><span className="employee-legend-dot" /> Dan s rezervacijom</p>
              </div>
            </aside>
          </div>
        </section>
      );
    }

    return (
      <section className="employee-overview">
        <div className="employee-welcome-copy">
          <span className="employee-eyebrow">FLEET MANAGEMENT</span>
          <h1>Dobrodošli, {employeeName}!</h1>
          <p>Na jednom mjestu zatražite službeno vozilo, pratite status rezervacije i prijavite problem tijekom korištenja.</p>
          <div className="employee-welcome-actions">
            <button className="employee-btn employee-btn-primary" onClick={() => setActiveTab('nova-rezervacija')}>
              Kreiraj rezervaciju
            </button>
            <button className="employee-btn employee-btn-secondary" onClick={() => setActiveTab('rezervacije')}>
              Pregled rezervacija
            </button>
          </div>
        </div>
        <div className="employee-welcome-image" aria-label="Ilustracija upravljanja voznim parkom" />

        <div className="employee-summary-grid">
          <article className="employee-summary-card">
            <span>Aktivni zahtjevi</span>
            <strong>{activeReservations.length}</strong>
            <small>Na čekanju, odobreno ili dodijeljeno vozilo</small>
          </article>
          <article className="employee-summary-card">
            <span>Dodijeljena vozila</span>
            <strong>{assignedReservations.length}</strong>
            <small>Rezervacije spremne za korištenje</small>
          </article>
          <article className="employee-summary-card">
            <span>Nadolazeći termini</span>
            <strong>{upcomingReservations.length}</strong>
            <small>Rezervacije koje još nisu završile</small>
          </article>
        </div>
      </section>
    );
  };

  return (
    <div className={`employee-dashboard ${darkMode ? 'employee-dark' : ''}`}>
      <header className="employee-header">
        <div className="employee-header-left">
          <img src="/dd_logo1.png" alt="Digitalna Dalmacija" className="employee-logo" />
          <h2>Bok, {employeeName}</h2>
        </div>
        <div className="employee-header-right">
          <button
            type="button"
            className="employee-icon-btn"
            title="Promjena teme"
            onClick={() => setDarkMode((value) => !value)}
            aria-label="Promjena teme"
          >
            <FontAwesomeIcon
              icon={darkMode ? faSun : faMoon}
              style={{ color: darkMode ? '#fff' : '#000' }}
            />
          </button>
          <div className="employee-profile-wrapper">
            <button
              type="button"
              className="employee-icon-btn employee-profile-icon"
              title="Profil"
              onClick={() => setShowProfile((value) => !value)}
              aria-label="Profil"
            >
              <FontAwesomeIcon icon={faUser} />
            </button>
            {showProfile && (
              <ProfilePopup
                name={employeeName}
                email={employeeEmail}
                onLogout={handleLogout}
                onClose={() => setShowProfile(false)}
                apiBase="/api/employee"
              />
            )}
          </div>
        </div>
      </header>

      <nav className="employee-tabs" aria-label="Navigacija zaposlenika">
        <button className={activeTab === 'pregled' ? 'active' : ''} onClick={() => setActiveTab('pregled')}>POČETNA</button>
        <button className={activeTab === 'rezervacije' ? 'active' : ''} onClick={() => setActiveTab('rezervacije')}>REZERVACIJE</button>
        <button className={activeTab === 'nova-rezervacija' ? 'active' : ''} onClick={() => setActiveTab('nova-rezervacija')}>NOVI ZAHTJEV</button>
        <button className={activeTab === 'problemi' ? 'active' : ''} onClick={() => setActiveTab('problemi')}>PRIJAVA PROBLEMA</button>
        <button className={activeTab === 'kalendar' ? 'active' : ''} onClick={() => setActiveTab('kalendar')}>KALENDAR</button>
      </nav>

      <main className="employee-content">{renderContent()}</main>

      <footer className="employee-footer">
        <strong>Digitalna Dalmacija</strong><br />
        Ul. Ruđera Boškovića 25<br />
        21000, Split
      </footer>

      {errorModal.isOpen && (
        <div className="employee-modal-overlay" onClick={() => setErrorModal({ isOpen: false, message: '' })}>
          <div className="employee-modal employee-message-modal" onClick={(e) => e.stopPropagation()}>
            <button className="employee-modal-close" onClick={() => setErrorModal({ isOpen: false, message: '' })}>×</button>
            <h3>Obavijest</h3>
            <p>{errorModal.message}</p>
            <div className="employee-modal-actions">
              <button className="employee-btn employee-btn-primary" onClick={() => setErrorModal({ isOpen: false, message: '' })}>
                U redu
              </button>
            </div>
          </div>
        </div>
      )}

      {problemModal.isOpen && (
        <div className="employee-modal-overlay" onClick={closeProblemModal}>
          <div className="employee-modal" onClick={(e) => e.stopPropagation()}>
            <button className="employee-modal-close" onClick={closeProblemModal}>×</button>
            <h3>Prijava problema</h3>
            <p className="employee-modal-subtitle">
              {problemModal.reservation.assignedVehicle?.name || 'Vozilo'} · {formatDate(problemModal.reservation.startDate)} – {formatDate(problemModal.reservation.endDate)}
            </p>
            <label className="employee-modal-label">
              Opišite problem ili štetu
              <textarea
                value={problemDescription}
                onChange={(e) => setProblemDescription(e.target.value)}
                placeholder="Navedite što se dogodilo i sve važne detalje..."
              />
            </label>
            <div className="employee-modal-actions">
              <button className="employee-btn employee-btn-secondary" onClick={closeProblemModal}>Odustani</button>
              <button className="employee-btn employee-btn-primary" onClick={submitProblem}>Pošalji prijavu</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeDashboard;
