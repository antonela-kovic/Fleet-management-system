import { useCallback, useEffect, useMemo, useState } from 'react';
import api, { getSession, errorMessage, logout } from '../services/api';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './EmployeeDashboard.css';
import ProfilePopup from './ProfilePopup';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faMoon, faSun } from '@fortawesome/free-solid-svg-icons';

const statusLabels = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  'vehicle assigned': 'Vehicle assigned',
  'cancelled by user': 'Cancelled',
  expired: 'Completed',
};

const statusClass = (status) => {
  if (status === 'vehicle assigned' || status === 'approved') return 'employee-status-success';
  if (status === 'rejected' || status === 'cancelled by user') return 'employee-status-danger';
  if (status === 'expired') return 'employee-status-muted';
  return 'employee-status-pending';
};

const formatDate = (value) => {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-GB');
};

const EmployeeDashboard = () => {
  const session = getSession();
  const employeeName = session.name || 'Employee';
  const employeeEmail = session.email || '';

  const [activeTab, setActiveTab] = useState('overview');
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
    try {
      setLoading(true);
      const response = await api.get('/employee/reservations');
      setReservations(response.data);
    } catch (error) {
      setErrorModal({ isOpen: true, message: errorMessage(error, 'Loading reservations failed.') });
    } finally {
      setLoading(false);
    }
  }, []);

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
      setErrorModal({ isOpen: true, message: 'The start date cannot be in the past.' });
      return;
    }

    if (startDate >= endDate) {
      setErrorModal({ isOpen: true, message: 'The end date must be after the start date.' });
      return;
    }

    try {
      await api.post('/employee/reservations', newReservation);
      setNewReservation({ vehicleType: '', startDate: '', endDate: '', purpose: '' });
      await fetchReservations();
      setActiveTab('reservations');
    } catch (error) {
      setErrorModal({
        isOpen: true,
        message: errorMessage(error, 'The reservation could not be created. Please try again.'),
      });
    }
  };

  const cancelReservation = async (reservation) => {
    const start = new Date(reservation.startDate);
    if (new Date() >= start) {
      setErrorModal({ isOpen: true, message: 'A reservation cannot be cancelled after it has started.' });
      return;
    }

    if (!window.confirm('Are you sure you want to cancel this reservation?')) return;

    try {
      await api.patch(`/employee/reservations/${reservation._id}/cancel`);
      await fetchReservations();
    } catch (error) {
      setErrorModal({
        isOpen: true,
        message: errorMessage(error, 'Cancelling the reservation failed.'),
      });
    }
  };

  const openProblemModal = (reservation) => {
    if (reservation.status !== 'vehicle assigned') {
      setErrorModal({
        isOpen: true,
        message: 'You can report a problem once the administrator has approved the reservation and assigned you a vehicle.',
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
      setErrorModal({ isOpen: true, message: 'The problem description cannot be empty.' });
      return;
    }

    try {
      await api.post('/employee/report-problem', {
        reservationId: problemModal.reservation._id,
        description: problemDescription.trim(),
      });
      closeProblemModal();
      setErrorModal({ isOpen: true, message: 'The problem has been reported to the administrator.' });
    } catch (error) {
      setErrorModal({
        isOpen: true,
        message: errorMessage(error, 'Reporting the problem failed. Please try again.'),
      });
    }
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
    () => reservations.filter((r) => new Date(r.endDate) >= new Date() && !['rejected', 'cancelled by user'].includes(r.status)),
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
            <th>Dates</th>
            <th>Vehicle type</th>
            <th>Purpose</th>
            <th>Assigned vehicle</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan="6" className="employee-empty-cell">No reservations to show.</td>
            </tr>
          ) : (
            items.map((reservation) => {
              const canCancel = new Date(reservation.startDate) > new Date()
                && !['cancelled by user', 'rejected', 'expired'].includes(reservation.status);

              return (
                <tr key={reservation._id}>
                  <td>{formatDate(reservation.startDate)} – {formatDate(reservation.endDate)}</td>
                  <td>{reservation.vehicleType || '—'}</td>
                  <td>{reservation.purpose || '—'}</td>
                  <td>
                    {reservation.assignedVehicle
                      ? `${reservation.assignedVehicle.name} (${reservation.assignedVehicle.type})`
                      : 'Not assigned'}
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
                          Cancel
                        </button>
                      )}
                      <button
                        type="button"
                        className="employee-btn employee-btn-secondary"
                        onClick={() => openProblemModal(reservation)}
                      >
                        Report problem
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
    if (activeTab === 'reservations') {
      return (
        <section className="employee-section">
          <div className="employee-section-heading">
            <div>
              <h2>My reservations</h2>
              <p>All current and past requests and their status.</p>
            </div>
            <button className="employee-btn employee-btn-primary" onClick={() => setActiveTab('new-reservation')}>
              New reservation
            </button>
          </div>
          {loading ? <div className="employee-loading">Loading reservations...</div> : renderReservationTable()}
        </section>
      );
    }

    if (activeTab === 'new-reservation') {
      return (
        <section className="employee-section employee-form-section">
          <div className="employee-section-heading">
            <div>
              <h2>New reservation</h2>
              <p>Enter the dates, the vehicle type and the purpose of the trip.</p>
            </div>
          </div>

          <form className="employee-reservation-form" onSubmit={createReservation}>
            <div className="employee-form-grid">
              <label>
                Preferred vehicle type
                <input
                  type="text"
                  placeholder="e.g. car, van"
                  value={newReservation.vehicleType}
                  onChange={(e) => setNewReservation({ ...newReservation, vehicleType: e.target.value })}
                  required
                />
              </label>
              <label>
                Start date
                <input
                  type="date"
                  min={todayString}
                  value={newReservation.startDate}
                  onChange={(e) => setNewReservation({ ...newReservation, startDate: e.target.value })}
                  required
                />
              </label>
              <label>
                End date
                <input
                  type="date"
                  min={newReservation.startDate || todayString}
                  value={newReservation.endDate}
                  onChange={(e) => setNewReservation({ ...newReservation, endDate: e.target.value })}
                  required
                />
              </label>
              <label className="employee-form-purpose">
                Purpose of the trip
                <textarea
                  placeholder="Briefly describe why you need the company vehicle..."
                  value={newReservation.purpose}
                  onChange={(e) => setNewReservation({ ...newReservation, purpose: e.target.value })}
                  required
                />
              </label>
            </div>
            <div className="employee-form-actions">
              <button type="button" className="employee-btn employee-btn-secondary" onClick={() => setActiveTab('reservations')}>
                Cancel
              </button>
              <button type="submit" className="employee-btn employee-btn-primary">
                Send request
              </button>
            </div>
          </form>
        </section>
      );
    }

    if (activeTab === 'problems') {
      return (
        <section className="employee-section">
          <div className="employee-section-heading">
            <div>
              <h2>Report a problem or damage</h2>
              <p>A problem can be reported for a reservation that already has an assigned vehicle.</p>
            </div>
          </div>

          <div className="employee-problem-grid">
            {assignedReservations.length === 0 ? (
              <div className="employee-empty-state">
                <strong>You currently have no reservation with an assigned vehicle.</strong>
                <span>Once the administrator assigns a vehicle, you can report problems here.</span>
              </div>
            ) : (
              assignedReservations.map((reservation) => (
                <article className="employee-problem-card" key={reservation._id}>
                  <div>
                    <span className="employee-card-label">Vehicle</span>
                    <h3>
                      {reservation.assignedVehicle
                        ? `${reservation.assignedVehicle.name} (${reservation.assignedVehicle.type})`
                        : 'No vehicle assigned'}
                    </h3>
                    <p>{formatDate(reservation.startDate)} – {formatDate(reservation.endDate)}</p>
                  </div>
                  <button className="employee-btn employee-btn-primary" onClick={() => openProblemModal(reservation)}>
                    Report problem
                  </button>
                </article>
              ))
            )}
          </div>
        </section>
      );
    }

    if (activeTab === 'calendar') {
      const selectedReservations = reservationForDate(selectedDate);

      return (
        <section className="employee-section employee-calendar-section">
          <div className="employee-calendar-layout">
            <div className="employee-calendar-card">
              <Calendar
                locale="en-GB"
                value={selectedDate}
                onChange={setSelectedDate}
                calendarType="iso8601"
                tileClassName={({ date, view }) => {
                  if (view !== 'month') return null;
                  return reservationForDate(date).length > 0 ? 'employee-has-reservation' : null;
                }}
              />
            </div>

            <aside className="employee-calendar-sidebar">
              <div className="employee-info-card">
                <span className="employee-card-label">Selected date</span>
                <h3>{selectedDate.toLocaleDateString('en-GB')}</h3>
              </div>
              <div className="employee-info-card">
                <span className="employee-card-label">Reservations on this day</span>
                {selectedReservations.length === 0 ? (
                  <p>No reservations.</p>
                ) : (
                  selectedReservations.map((reservation) => (
                    <div className="employee-calendar-item" key={reservation._id}>
                      <strong>{reservation.vehicleType || 'Vehicle'}</strong>
                      <span>{statusLabels[reservation.status] || reservation.status}</span>
                    </div>
                  ))
                )}
              </div>
              <div className="employee-info-card">
                <span className="employee-card-label">Legend</span>
                <p><span className="employee-legend-dot" /> Day with a reservation</p>
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
          <h1>Welcome, {employeeName}!</h1>
          <p>Request a company vehicle, track your reservations and report problems, all in one place.</p>
          <div className="employee-welcome-actions">
            <button className="employee-btn employee-btn-primary" onClick={() => setActiveTab('new-reservation')}>
              Create reservation
            </button>
            <button className="employee-btn employee-btn-secondary" onClick={() => setActiveTab('reservations')}>
              View reservations
            </button>
          </div>
        </div>
        <div className="employee-welcome-image" aria-label="Fleet management illustration" />

        <div className="employee-summary-grid">
          <article className="employee-summary-card">
            <span>Active requests</span>
            <strong>{activeReservations.length}</strong>
            <small>Pending, approved or with an assigned vehicle</small>
          </article>
          <article className="employee-summary-card">
            <span>Assigned vehicles</span>
            <strong>{assignedReservations.length}</strong>
            <small>Reservations ready to use</small>
          </article>
          <article className="employee-summary-card">
            <span>Upcoming</span>
            <strong>{upcomingReservations.length}</strong>
            <small>Reservations that have not ended yet</small>
          </article>
        </div>
      </section>
    );
  };

  return (
    <div className={`employee-dashboard ${darkMode ? 'employee-dark' : ''}`}>
      <header className="employee-header">
        <div className="employee-header-left">
          <img src="/logo.png" alt="Logo" className="employee-logo" />
          <h2>Hi, {employeeName}</h2>
        </div>
        <div className="employee-header-right">
          <button
            type="button"
            className="employee-icon-btn"
            title="Toggle theme"
            onClick={() => setDarkMode((value) => !value)}
            aria-label="Toggle theme"
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
              title="Profile"
              onClick={() => setShowProfile((value) => !value)}
              aria-label="Profile"
            >
              <FontAwesomeIcon icon={faUser} />
            </button>
            {showProfile && (
              <ProfilePopup
                name={employeeName}
                email={employeeEmail}
                onLogout={logout}
                onClose={() => setShowProfile(false)}
              />
            )}
          </div>
        </div>
      </header>

      <nav className="employee-tabs" aria-label="Employee navigation">
        <button className={activeTab === 'overview' ? 'active' : ''} onClick={() => setActiveTab('overview')}>HOME</button>
        <button className={activeTab === 'reservations' ? 'active' : ''} onClick={() => setActiveTab('reservations')}>RESERVATIONS</button>
        <button className={activeTab === 'new-reservation' ? 'active' : ''} onClick={() => setActiveTab('new-reservation')}>NEW REQUEST</button>
        <button className={activeTab === 'problems' ? 'active' : ''} onClick={() => setActiveTab('problems')}>REPORT PROBLEM</button>
        <button className={activeTab === 'calendar' ? 'active' : ''} onClick={() => setActiveTab('calendar')}>CALENDAR</button>
      </nav>

      <main className="employee-content">{renderContent()}</main>

      <footer className="employee-footer">
        Fleet Management System
      </footer>

      {errorModal.isOpen && (
        <div className="employee-modal-overlay" onClick={() => setErrorModal({ isOpen: false, message: '' })}>
          <div className="employee-modal employee-message-modal" onClick={(e) => e.stopPropagation()}>
            <button className="employee-modal-close" onClick={() => setErrorModal({ isOpen: false, message: '' })}>×</button>
            <h3>Notice</h3>
            <p>{errorModal.message}</p>
            <div className="employee-modal-actions">
              <button className="employee-btn employee-btn-primary" onClick={() => setErrorModal({ isOpen: false, message: '' })}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {problemModal.isOpen && (
        <div className="employee-modal-overlay" onClick={closeProblemModal}>
          <div className="employee-modal" onClick={(e) => e.stopPropagation()}>
            <button className="employee-modal-close" onClick={closeProblemModal}>×</button>
            <h3>Report a problem</h3>
            <p className="employee-modal-subtitle">
              {problemModal.reservation.assignedVehicle?.name || 'Vehicle'} · {formatDate(problemModal.reservation.startDate)} – {formatDate(problemModal.reservation.endDate)}
            </p>
            <label className="employee-modal-label">
              Describe the problem or damage
              <textarea
                value={problemDescription}
                onChange={(e) => setProblemDescription(e.target.value)}
                placeholder="What happened? Add any important details..."
              />
            </label>
            <div className="employee-modal-actions">
              <button className="employee-btn employee-btn-secondary" onClick={closeProblemModal}>Cancel</button>
              <button className="employee-btn employee-btn-primary" onClick={submitProblem}>Send report</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeDashboard;
