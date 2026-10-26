import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMoon, faSun, faBell, faUser, faTrash, faClock, faChartColumn, faCircleInfo, faCar,
} from '@fortawesome/free-solid-svg-icons';
import api, { getSession, errorMessage, logout } from '../services/api';
import ProfilePopup from './ProfilePopup';
import './AdminDashboard.css';

const toIsoDay = (date) => new Date(date).toISOString().split('T')[0];
const formatDate = (value) => (value ? new Date(value).toLocaleDateString('en-GB') : '—');
const isDayInRange = (day, start, end) => {
  const d = new Date(day);
  return d >= new Date(toIsoDay(start)) && d <= new Date(toIsoDay(end));
};

const EMPTY_VEHICLE = { plate: '', model: '', registrationDate: '' };

const DigitalClock = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="clock">
      <h3><FontAwesomeIcon icon={faClock} /> Time</h3>
      <div className="clock-time">{time.toLocaleTimeString('en-GB')}</div>
    </div>
  );
};

const StatisticsPanel = ({ reservations, notes }) => (
  <div className="statistics">
    <h3><FontAwesomeIcon icon={faChartColumn} /> Statistics</h3>
    <p>Reservations: {reservations.length}</p>
    <p>Notes: {notes.length}</p>
  </div>
);

StatisticsPanel.propTypes = {
  reservations: PropTypes.array.isRequired,
  notes: PropTypes.array.isRequired,
};

const LegendPanel = () => (
  <div className="legend">
    <h3><FontAwesomeIcon icon={faCircleInfo} /> Legend</h3>
    <ul>
      <li><span className="dot green" /> Note</li>
      <li><span className="dot blue" /> Reservation</li>
      <li><span className="dot purple" /> Both</li>
    </ul>
  </div>
);

const AdminDashboard = () => {
  const session = getSession();
  const adminName = session.name || 'Administrator';
  const adminEmail = session.email || '';
  const today = toIsoDay(new Date());

  const [activeTab, setActiveTab] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [showProfilePopup, setShowProfilePopup] = useState(false);

  const [vehicles, setVehicles] = useState([]);
  const [newVehicle, setNewVehicle] = useState(EMPTY_VEHICLE);
  const [showVehicleModal, setShowVehicleModal] = useState(false);

  const [reservations, setReservations] = useState([]);
  const [issues, setIssues] = useState([]);

  const [notes, setNotes] = useState([]);
  const [noteForm, setNoteForm] = useState({ date: today, text: '' });
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [showNoteModal, setShowNoteModal] = useState(false);

  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);

  const availableVehicles = vehicles.filter((v) => v.status === 'available');

  /* ===== Data loading ===== */

  const fetchVehicles = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/vehicles');
      setVehicles(data);
    } catch (error) {
      console.error('Loading vehicles failed:', error);
    }
  }, []);

  const fetchReservations = useCallback(async () => {
    try {
      await api.post('/admin/reservations/check-expired');
      const { data } = await api.get('/admin/reservations');
      setReservations(data);
    } catch (error) {
      console.error('Loading reservations failed:', error);
    }
  }, []);

  const fetchIssues = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/issues');
      setIssues(data);
    } catch (error) {
      console.error('Loading issues failed:', error);
    }
  }, []);

  const fetchNotes = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/notes');
      setNotes(data);
    } catch (error) {
      console.error('Loading notes failed:', error);
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/vehicles/upcoming-registration');
      setNotifications(data);
    } catch (error) {
      console.error('Loading notifications failed:', error);
    }
  }, []);

  useEffect(() => {
    fetchVehicles();
    fetchReservations();
    fetchIssues();
    fetchNotes();
    fetchNotifications();
  }, [fetchVehicles, fetchReservations, fetchIssues, fetchNotes, fetchNotifications]);

  useEffect(() => {
    document.body.className = darkMode ? 'dark-mode' : 'light-mode';
  }, [darkMode]);

  /* ===== Vehicles ===== */

  // Accepts 27.09.2027, 27/09/2027, 27-09-2027, 27092027 and 2027-09-27; returns YYYY-MM-DD or null.
  const parseDate = (input) => {
    const value = String(input || '').trim();
    let day;
    let month;
    let year;

    if (/^\d{8}$/.test(value)) {
      day = Number(value.slice(0, 2));
      month = Number(value.slice(2, 4));
      year = Number(value.slice(4, 8));
    } else if (/^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}$/.test(value)) {
      [day, month, year] = value.split(/[./-]/).map(Number);
      if (year < 100) year += 2000;
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      [year, month, day] = value.split('-').map(Number);
    } else {
      return null;
    }

    const check = new Date(Date.UTC(year, month - 1, day));
    if (
      Number.isNaN(check.getTime())
      || check.getUTCFullYear() !== year
      || check.getUTCMonth() !== month - 1
      || check.getUTCDate() !== day
    ) {
      return null;
    }
    return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const handleVehicleInput = (e) => {
    const { name, value } = e.target;
    setNewVehicle({ ...newVehicle, [name]: value });
  };

  const addVehicle = async () => {
    const { plate, model, registrationDate } = newVehicle;

    if (!plate.trim() || !model.trim() || !registrationDate.trim()) {
      alert('Please fill in all fields.');
      return;
    }

    const parsedDate = parseDate(registrationDate);
    if (!parsedDate) {
      alert('Invalid date. Enter e.g. 27.09.2027.');
      return;
    }

    try {
      await api.post('/admin/vehicles', {
        name: plate.trim().toUpperCase(),
        type: model.trim(),
        registrationExpiryDate: parsedDate,
      });
      await fetchVehicles();
      await fetchNotifications();
      setNewVehicle(EMPTY_VEHICLE);
      setShowVehicleModal(false);
    } catch (error) {
      alert(errorMessage(error, 'Adding the vehicle failed.'));
    }
  };

  const deleteVehicle = async (id) => {
    if (!window.confirm('Are you sure you want to delete this vehicle?')) return;

    try {
      await api.delete(`/admin/vehicles/${id}`);
      setVehicles((prev) => prev.filter((v) => v._id !== id));
    } catch (error) {
      alert(errorMessage(error, 'Deleting the vehicle failed.'));
    }
  };

  /* ===== Reservations ===== */

  const updateReservation = async (id, payload) => {
    try {
      await api.put(`/admin/reservations/${id}`, payload);
      await fetchReservations();
      await fetchVehicles();
    } catch (error) {
      alert(errorMessage(error, 'Updating the reservation failed.'));
    }
  };

  const deleteReservation = async (id) => {
    if (!window.confirm('Are you sure you want to delete this reservation?')) return;

    try {
      await api.delete(`/admin/reservations/${id}`);
      await fetchReservations();
      await fetchVehicles();
    } catch (error) {
      alert(errorMessage(error, 'Deleting the reservation failed.'));
    }
  };

  const issueForReservation = (reservationId) =>
    issues.find((issue) => issue.reservation && String(issue.reservation._id) === String(reservationId));

  /* ===== Notes ===== */

  const openNoteModal = (note = null) => {
    setEditingNoteId(note ? note._id : null);
    setNoteForm(note ? { date: toIsoDay(note.date), text: note.text } : { date: today, text: '' });
    setShowNoteModal(true);
  };

  const closeNoteModal = () => {
    setShowNoteModal(false);
    setEditingNoteId(null);
    setNoteForm({ date: today, text: '' });
  };

  const saveNote = async () => {
    if (!noteForm.date || !noteForm.text.trim()) {
      alert('Please fill in all fields.');
      return;
    }

    try {
      if (editingNoteId) {
        await api.put(`/admin/notes/${editingNoteId}`, noteForm);
      } else {
        await api.post('/admin/notes', noteForm);
      }
      await fetchNotes();
      closeNoteModal();
    } catch (error) {
      alert(errorMessage(error, 'Saving the note failed.'));
    }
  };

  const deleteNote = async (id) => {
    if (!window.confirm('Are you sure you want to delete this note?')) return;

    try {
      await api.delete(`/admin/notes/${id}`);
      setNotes((prev) => prev.filter((n) => n._id !== id));
    } catch (error) {
      alert(errorMessage(error, 'Deleting the note failed.'));
    }
  };

  /* ===== Rendering ===== */

  const renderReservationStatus = (reservation) => {
    if (reservation.status === 'pending') {
      return (
        <>
          <button onClick={() => updateReservation(reservation._id, { status: 'approved' })}>Approve</button>
          <button onClick={() => updateReservation(reservation._id, { status: 'rejected' })}>Reject</button>
        </>
      );
    }
    if (reservation.status === 'approved' && !reservation.assignedVehicle) {
      return (
        <select
          defaultValue=""
          onChange={(e) => updateReservation(reservation._id, { status: 'vehicle assigned', vehicleId: e.target.value })}
        >
          <option value="" disabled>Choose a vehicle</option>
          {availableVehicles.map((vehicle) => (
            <option key={vehicle._id} value={vehicle._id}>
              {vehicle.name} ({vehicle.type})
            </option>
          ))}
        </select>
      );
    }
    const labels = {
      'vehicle assigned': ['Assigned', 'green'],
      rejected: ['Rejected', 'gray'],
      'cancelled by user': ['Cancelled by employee', 'gray'],
      expired: ['Completed', 'gray'],
    };
    const [label, color] = labels[reservation.status] || [reservation.status, 'gray'];
    return <span style={{ color }}>{label}</span>;
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'vehicles':
        return (
          <div className="vehicles-section">
            <table className="vehicles-table">
              <thead>
                <tr>
                  <th>Licence plate</th>
                  <th>Model</th>
                  <th>Registration expires</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map((vehicle) => (
                  <tr key={vehicle._id}>
                    <td>{vehicle.name}</td>
                    <td>{vehicle.type}</td>
                    <td>{formatDate(vehicle.registrationExpiryDate)}</td>
                    <td style={{ color: vehicle.status === 'available' ? 'green' : 'red' }}>
                      {vehicle.status === 'available' ? 'AVAILABLE' : 'IN USE'}
                    </td>
                    <td>
                      <button onClick={() => deleteVehicle(vehicle._id)} aria-label="Delete vehicle">
                        <FontAwesomeIcon icon={faTrash} style={{ fontSize: '18px' }} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="vehicles-header">
              <button onClick={() => setShowVehicleModal(true)} className="btn-secondary">Add vehicle</button>
            </div>

            {showVehicleModal && (
              <div className="modal-overlay">
                <div className="modal">
                  <button className="popup-close" onClick={() => setShowVehicleModal(false)} aria-label="Close">✖</button>
                  <h3>Add vehicle</h3>
                  <input type="text" name="plate" placeholder="Licence plate" value={newVehicle.plate} onChange={handleVehicleInput} />
                  <input type="text" name="model" placeholder="Model" value={newVehicle.model} onChange={handleVehicleInput} />
                  <input
                    type="text"
                    name="registrationDate"
                    placeholder="Registration expires (e.g. 27.09.2027)"
                    value={newVehicle.registrationDate}
                    onChange={handleVehicleInput}
                  />
                  <div className="modal-actions">
                    <button onClick={addVehicle}>Add</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 'reservations':
        return (
          <div className="reservations-section">
            <table className="reservations-table">
              <thead>
                <tr>
                  <th>Dates</th>
                  <th>Employee</th>
                  <th>Assigned vehicle</th>
                  <th>Reported problem</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reservations.map((reservation) => (
                  <tr key={reservation._id}>
                    <td>{formatDate(reservation.startDate)} – {formatDate(reservation.endDate)}</td>
                    <td>
                      {reservation.employeeId
                        ? `${reservation.employeeId.name} (${reservation.employeeId.email})`
                        : 'Unknown'}
                    </td>
                    <td>
                      {reservation.assignedVehicle
                        ? `${reservation.assignedVehicle.name} (${reservation.assignedVehicle.type})`
                        : 'Not assigned'}
                    </td>
                    <td>{issueForReservation(reservation._id)?.description || 'No problem reported'}</td>
                    <td>{renderReservationStatus(reservation)}</td>
                    <td>
                      <button onClick={() => deleteReservation(reservation._id)} aria-label="Delete reservation">
                        <FontAwesomeIcon icon={faTrash} style={{ fontSize: '18px' }} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'notes':
        return (
          <div className="notes-section">
            <div className="notes-header">
              <h3>Notes</h3>
              <button onClick={() => openNoteModal()} className="btn-secondary">Add note</button>
            </div>

            <div className="notes-list">
              {notes.map((note) => (
                <div className="note-card" key={note._id}>
                  <p><strong>Author:</strong> {note.author}</p>
                  <p><strong>Date:</strong> {formatDate(note.date)}</p>
                  <p><strong>Note:</strong> {note.text}</p>
                  <div className="note-actions">
                    <button onClick={() => openNoteModal(note)}>Edit</button>
                    <button onClick={() => deleteNote(note._id)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>

            {showNoteModal && (
              <div className="modal-overlay">
                <div className="modal">
                  <h3>{editingNoteId ? 'Edit note' : 'New note'}</h3>
                  <input
                    type="date"
                    name="date"
                    value={noteForm.date}
                    onChange={(e) => setNoteForm({ ...noteForm, date: e.target.value })}
                  />
                  <textarea
                    name="text"
                    placeholder="Note"
                    value={noteForm.text}
                    onChange={(e) => setNoteForm({ ...noteForm, text: e.target.value })}
                  />
                  <div className="modal-actions">
                    <button onClick={saveNote}>Save</button>
                    <button onClick={closeNoteModal}>Cancel</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 'calendar': {
        const notesOn = (iso) => notes.filter((n) => toIsoDay(n.date) === iso);
        const reservationsOn = (iso) => reservations.filter((r) => isDayInRange(iso, r.startDate, r.endDate));

        return (
          <div className="calendar-wrapper">
            <div className="calendar-section">
              <Calendar
                locale="en-GB"
                onChange={setSelectedDate}
                value={selectedDate}
                calendarType="iso8601"
                tileClassName={({ date, view }) => {
                  if (view !== 'month') return null;
                  const iso = toIsoDay(date);
                  const hasReservation = reservationsOn(iso).length > 0;
                  const hasNote = notesOn(iso).length > 0;
                  if (hasReservation && hasNote) return 'both-events';
                  if (hasReservation) return 'has-reservation';
                  if (hasNote) return 'has-note';
                  return null;
                }}
              />

              {selectedDate && (
                <div className="popup-overlay" onClick={() => setSelectedDate(null)}>
                  <div className="popup-content" onClick={(e) => e.stopPropagation()}>
                    <button className="popup-close" onClick={() => setSelectedDate(null)} aria-label="Close">✖</button>
                    <h3>{selectedDate.toLocaleDateString('en-GB')}</h3>
                    {reservationsOn(toIsoDay(selectedDate)).map((r) => (
                      <p key={`reservation-${r._id}`}>
                        🔵 Reservation: {r.employeeId?.name || 'Unknown'}, {r.assignedVehicle?.name || 'no vehicle'}
                      </p>
                    ))}
                    {notesOn(toIsoDay(selectedDate)).map((n) => (
                      <p key={`note-${n._id}`}>🟢 Note: {n.author}, {n.text}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="calendar-sidebar">
              <DigitalClock />
              <StatisticsPanel reservations={reservations} notes={notes} />
              <LegendPanel />
            </div>
          </div>
        );
      }

      default:
        return (
          <div className="placeholder">
            <h2>Welcome!</h2>
            <p>Choose a section to get started.</p>
            <img src="/vehicle.webp" alt="Vehicle illustration" className="placeholder-image" />
          </div>
        );
    }
  };

  const tabs = [
    ['vehicles', 'VEHICLES'],
    ['reservations', 'RESERVATIONS'],
    ['notes', 'NOTES'],
    ['calendar', 'CALENDAR'],
  ];

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <div className="header-left">
          <img src="/logo.png" alt="Logo" className="logo" />
          <h2>Hi, {adminName}</h2>
        </div>
        <div className="header-right">
          <button title="Toggle theme" onClick={() => setDarkMode((prev) => !prev)}>
            <FontAwesomeIcon icon={darkMode ? faSun : faMoon} style={{ color: darkMode ? '#fff' : '#000' }} />
          </button>

          <div className="notification-wrapper">
            <button onClick={() => setShowNotifications((prev) => !prev)} className="notification-button" title="Notifications">
              <FontAwesomeIcon icon={faBell} />
              {notifications.length > 0 && <span className="notification-count">{notifications.length}</span>}
            </button>

            {showNotifications && (
              <div className="notifications-popup">
                <h4>Vehicle registrations</h4>
                {notifications.length === 0 ? (
                  <p>No notifications.</p>
                ) : (
                  <ul>
                    {notifications.map((n) => (
                      <li key={n.id}>
                        <FontAwesomeIcon icon={faCar} style={{ marginRight: '5px' }} />
                        <strong>{n.vehicle}</strong> expires in {n.daysLeft} day(s) ({formatDate(n.date)})
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <div className="notification-wrapper">
            <button onClick={() => setShowProfilePopup(!showProfilePopup)} title="Profile">
              <FontAwesomeIcon icon={faUser} style={{ color: darkMode ? '#fff' : '#000' }} />
            </button>
            {showProfilePopup && (
              <ProfilePopup
                name={adminName}
                email={adminEmail}
                onLogout={logout}
                onClose={() => setShowProfilePopup(false)}
              />
            )}
          </div>
        </div>
      </header>

      <nav className="admin-tabs">
        {tabs.map(([key, label]) => (
          <button key={key} onClick={() => setActiveTab(key)} className={activeTab === key ? 'active' : ''}>
            {label}
          </button>
        ))}
      </nav>

      <main className="admin-content">{renderContent()}</main>

      <footer className="admin-footer">Fleet Management System</footer>
    </div>
  );
};

export default AdminDashboard;
