
import { useState, useEffect } from 'react';
import './AdminDashboard.css';
import ProfilePopup from './ProfilePopup';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { setDefaultOptions } from 'date-fns';
import { hr } from 'date-fns/locale';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMoon, faSun, faBell, faUser, faTrash, faClock, faChartColumn, faCircleInfo, faCar } from '@fortawesome/free-solid-svg-icons';


setDefaultOptions({ locale: hr });

// Komponenta za profil
// const ProfilePopup = ({ name, onLogout, onClose }) => {
//   return (
//     <div className="profil-popup">
//       <button className="popup-close" onClick={onClose}>×</button>
//       <p><strong>Korisnik:</strong> {name}</p>
//       <button onClick={onLogout} className="btn-primary">Odjava</button>
//     </div>
//   );
// };


// ✨ DODANO
const DigitalClock = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const pad = (n) => n.toString().padStart(2, '0');

  return (
    <div className="clock">
      <h3><FontAwesomeIcon icon={faClock} />
        Vrijeme</h3>
      <div className="clock-time">
        {pad(time.getHours())}:{pad(time.getMinutes())}:{pad(time.getSeconds())}
      </div>
    </div>
  );
};

const StatisticsPanel = ({ rezervacije, biljeske }) => (
  <div className="statistics">
    <h3><FontAwesomeIcon icon={faChartColumn} />
      Statistika</h3>
    <p>Rezervacija: {rezervacije.length}</p>
    <p>Bilješki: {biljeske.length}</p>
  </div>
);

const LegendPanel = () => (
  <div className="legend">
    <h3><FontAwesomeIcon icon={faCircleInfo} />
      Legenda</h3>
    <ul>
      <li><span className="dot green" /> Bilješka</li>
      <li><span className="dot blue" /> Rezervacija</li>
      <li><span className="dot purple" /> Oboje</li>
    </ul>
  </div>
);


const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const adminName = sessionStorage.getItem('name') || 'Administrator';
  const adminEmail = sessionStorage.getItem('email') || 'N/A';
  const [vozila, setVozila] = useState([]);
  const [novoVozilo, setNovoVozilo] = useState({
    registracija: '',
    model: '',
    datum: '',
  });
  const [rezervacije, setRezervacije] = useState([]);
  const [dostupnaVozila, setDostupnaVozila] = useState([]);
  const [problemi, setProblemi] = useState([]);
  const [biljeske, setBiljeske] = useState([]);
  const [obavijesti, setObavijesti] = useState([]);
  const [prikaziObavijesti, setPrikaziObavijesti] = useState(false);
  const [showProfilePopup, setShowProfilePopup] = useState(false);




  // Prikaz vozila iz baze
  const fetchVozila = async () => {
    try {
      const response = await axios.get('/api/admin/vehicles');
      setVozila(response.data);

      const dostupni = response.data.filter(v => v.status === 'available');
      setDostupnaVozila(dostupni);
    } catch (error) {
      console.error('Greška pri dohvaćanju vozila:', error);
    }
  };

  useEffect(() => {
    fetchVozila();
  }, []);



  // Dodavanje vozila
  const handleAddVozilo = async () => {
    const { registracija, model, datum } = novoVozilo;

    if (!registracija.trim() || !model.trim() || !datum.trim()) {
      alert('Molimo ispunite sva polja.');
      return;
    }

    // Prihvaca: 27.09.2027, 27/09/2027, 27-09-2027, 27092027 i 2027-09-27.
    const parsedDate = parseDatum(datum);
    if (!parsedDate) {
      alert('Datum nije ispravan. Unesite npr. 27.09.2027.');
      return;
    }

    try {
      await axios.post('/api/admin/vehicles', {
        name: registracija.trim().toUpperCase(),
        type: model.trim(),
        status: 'available',
        registrationExpiryDate: parsedDate,
      });

      // Ponovno dohvati vozila iz baze kako bi prikaz uvijek odgovarao MongoDB-u.
      await fetchVozila();

      alert('Vozilo uspješno dodano.');
      setNovoVozilo({ registracija: '', model: '', datum: '' });
      setShowModal(false);
    } catch (error) {
      console.error('Greška pri dodavanju vozila:', error.response?.data || error);
      alert(error.response?.data?.message || 'Dodavanje vozila nije uspjelo.');
    }
  };
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNovoVozilo({ ...novoVozilo, [name]: value });
  };

  // Parsira vise uobicajenih formata datuma i vraca YYYY-MM-DD za backend.
  const parseDatum = (str) => {
    if (!str) return null;

    const value = String(str).trim();
    let dan;
    let mjesec;
    let godina;

    if (/^\d{8}$/.test(value)) {
      // 27092027
      dan = Number(value.slice(0, 2));
      mjesec = Number(value.slice(2, 4));
      godina = Number(value.slice(4, 8));
    } else if (/^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}$/.test(value)) {
      // 27.09.2027, 27/09/2027 ili 27-09-2027
      const dijelovi = value.split(/[./-]/).map(Number);
      [dan, mjesec, godina] = dijelovi;
      if (godina < 100) godina += 2000;
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      // 2027-09-27
      [godina, mjesec, dan] = value.split('-').map(Number);
    } else {
      return null;
    }

    const provjera = new Date(Date.UTC(godina, mjesec - 1, dan));
    if (
      Number.isNaN(provjera.getTime()) ||
      provjera.getUTCFullYear() !== godina ||
      provjera.getUTCMonth() !== mjesec - 1 ||
      provjera.getUTCDate() !== dan
    ) {
      return null;
    }

    return `${String(godina).padStart(4, '0')}-${String(mjesec).padStart(2, '0')}-${String(dan).padStart(2, '0')}`;
  };

  // Ova ostaje ista, samo više ne sadrži parseDatum iznutra
  const parseTerminUDatume = (termin) => {
    const [pocetni, zavrsni] = termin.replace(/\s/g, '').split('–');
    const start = parseDatum(pocetni);
    const end = parseDatum(zavrsni);

    const datumi = [];
    const temp = new Date(start);

    while (temp <= end) {
      datumi.push(temp.toISOString().split('T')[0]);
      temp.setDate(temp.getDate() + 1);
    }

    return datumi;
  };


  const obrisiVozilo = async (id) => {
    if (!window.confirm("Jeste li sigurni da želite obrisati ovo vozilo?")) return;

    try {
      await axios.delete(`/api/admin/vehicles/${id}`);
      setVozila(prev => prev.filter(v => v._id !== id));
    } catch (err) {
      console.error("Greška pri brisanju vozila:", err);
      alert("Brisanje nije uspjelo.");
    }
  };





  //REZERVACIJE

  useEffect(() => {
    fetchVozila();
  }, []);

  const fetchReservations = async () => {
    try {
      await axios.post('/api/admin/reservations/check-expired'); // ← ovo dodaj
      const res = await axios.get('/api/admin/reservations');
      setRezervacije(res.data);
    } catch (err) {
      console.error('Greška pri dohvatu rezervacija:', err);
    }
  };

  useEffect(() => {
    fetchReservations();
  }, []);


  const promijeniStatus = async (id, status) => {
    try {
      await axios.put(`/api/admin/reservations/${id}`, { status });
      setRezervacije(prev => prev.map(r => r._id === id ? { ...r, status } : r));
    } catch (err) {
      console.error('Greška pri promjeni statusa:', err);
    }
  };

  const dodijeliVozilo = async (id, vehicleId) => {
    try {
      await axios.put(`/api/admin/reservations/${id}`, {
        vehicleId,
        status: 'vehicle assigned'
      });

      // Nakon uspješne dodjele, ponovno dohvat podataka iz baze:
      await fetchReservations();
      await fetchVozila();
    } catch (err) {
      console.error('Greška pri dodjeli vozila:', err);
    }
  };



  const obrisiRezervaciju = async (id) => {
    if (!window.confirm('Jeste li sigurni da želite izbrisati ovu rezervaciju?')) return;

    try {
      await axios.delete(`/api/admin/reservations/${id}`);

      alert('Rezervacija obrisana.');

      // Ponovno dohvaćanje ažuriranih podataka
      await fetchReservations();
      await fetchVozila();
    } catch (err) {
      console.error('Greška pri brisanju rezervacije:', err);
      alert('Nešto je pošlo po zlu.');
    }
  };

  // Dio za prikaz problema kod rezervacija
  const fetchProblemi = async () => {
    try {
      const res = await axios.get('/api/admin/issues');
      setProblemi(res.data);
    } catch (err) {
      console.error('Greška pri dohvatu problema:', err);
    }
  };

  useEffect(() => {
    fetchProblemi();
  }, []);


  // Bilješke
  const today = new Date().toISOString().split('T')[0];
  const [novaBiljeska, setNovaBiljeska] = useState({
    ime: '',
    datum: today,
    opis: ''
  });

  const [showBiljeskaModal, setShowBiljeskaModal] = useState(false);
  const [urediId, setUrediId] = useState(null);



  const fetchBiljeske = async () => {
    try {
      const res = await axios.get('/api/admin/notes');
      setBiljeske(res.data.sort((a, b) => new Date(b.datum) - new Date(a.datum)));
    } catch (err) {
      console.error('Greška pri dohvaćanju bilješki:', err);
    }
  };

  useEffect(() => {
    fetchBiljeske();
  }, []);

  const handleChangeBiljeska = (e) => {
    const { name, value } = e.target;
    setNovaBiljeska(prev => ({ ...prev, [name]: value }));
  };

  const spremiBiljesku = async () => {
    const { ime, datum, opis } = novaBiljeska;

    if (!ime.trim() || !datum.trim() || !opis.trim()) {
      alert('Molimo ispunite sva polja.');
      return;
    }

    try {
      if (urediId) {
        // Ažuriranje postojeće bilješke
        await axios.put(`/api/admin/notes/${urediId}`, novaBiljeska);
      } else {
        // Dodavanje nove bilješke
        await axios.post('/api/admin/notes', novaBiljeska);
      }

      // Ponovno dohvaćanje ažuriranih bilješki s backenda
      await fetchBiljeske();

      // Reset forme
      setNovaBiljeska({ ime: '', datum: today, opis: '' });
      setUrediId(null);
      setShowBiljeskaModal(false);
    } catch (err) {
      console.error('Greška pri spremanju bilješke:', err);
      alert('Greška pri spremanju.');
    }
  };




  const obrisiBiljesku = async (index) => {
    const potvrda = window.confirm('Jeste li sigurni da želite izbrisati ovu bilješku?');
    if (!potvrda) return;

    try {
      const id = biljeske[index]._id;
      await axios.delete(`/api/admin/notes/${id}`);
      setBiljeske(prev => prev.filter((_, i) => i !== index));
    } catch (err) {
      console.error('Greška pri brisanju bilješke:', err);
      alert('Greška pri brisanju.');
    }
  };


  const urediBiljesku = (index) => {
    const biljeska = biljeske[index];
    setNovaBiljeska({
      ime: biljeska.ime,
      datum: biljeska.datum,
      opis: biljeska.opis
    });

    setUrediId(biljeska._id);  // ← koristi ID
    setShowBiljeskaModal(true);
  };



  // Kalendar

  const [weatherData] = useState({
    '2025-07-26': { icon: '☀️', temp: '29°C' },
    '2025-07-27': { icon: '🌧️', temp: '23°C' },
    '2025-07-28': { icon: '⛅', temp: '26°C' }
  });

  const jeDatumURasponu = (datum, startDate, endDate) => {
    const provjera = new Date(datum);
    const pocetak = new Date(startDate);
    const kraj = new Date(endDate);
    return provjera >= pocetak && provjera <= kraj;
  };

  // Dark - Light mode
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    document.body.className = darkMode ? 'dark-mode' : 'light-mode';
  }, [darkMode]);


  // Obavjesti

  const dohvatiObavijesti = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/admin/vehicles/upcoming-registration');
      setObavijesti(res.data);
    } catch (err) {
      console.error("Greška kod dohvaćanja obavijesti:", err);
    }
  };


  useEffect(() => {

    dohvatiObavijesti();
  }, []);

  // Profil
  const handleLogout = () => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('userId');
    sessionStorage.removeItem('role');
    sessionStorage.removeItem('name');
    sessionStorage.removeItem('email');
    
    window.location.href = '/login'; // ili navigate('/login') ako koristiš react-router
  };


  const renderContent = () => {
    switch (activeTab) {
      case 'vozila':
        return (
          <div className="vozila-section">
            <table className="vozila-table">
              <thead>
                <tr>
                  <th>Registracijska oznaka</th>
                  <th>Model</th>
                  <th>Datum registracije</th>
                  <th>Status</th>
                  <th>Akcije</th>
                </tr>
              </thead>
              <tbody>
                {vozila.map((vozilo) => (
                  <tr key={vozilo._id}>
                    <td>{vozilo.name}</td>   {/* Registracijska oznaka */}
                    <td>{vozilo.type}</td>   {/* Model */}
                    <td>
                      {vozilo.registrationExpiryDate
                        ? new Date(vozilo.registrationExpiryDate).toLocaleDateString('hr-HR')
                        : 'Nevažeći datum'}
                    </td>
                    <td style={{ color: vozilo.status === 'available' ? 'green' : 'red' }}>
                      {vozilo.status === 'available' ? 'SLOBODNO' : 'ZAUZET'}
                    </td>
                    <td>
                      <button onClick={() => obrisiVozilo(vozilo._id)}><FontAwesomeIcon icon={faTrash} style={{ fontSize: '18px' }} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* GUMB ZA OTVARANJE MODALA */}
            <div className="vozila-header">
              <button
                onClick={() => setShowModal(true)}
                className="btn-secondary"
              >
                Dodaj novo vozilo
              </button>
            </div>

            {/* MODAL ZA DODAVANJE VOZILA */}
            {showModal && (
              <div className="modal-overlay">
                <div className="modal">
                  {/* Gumb za zatvaranje */}
                  <button className="popup-close" onClick={() => setShowModal(false)}>✖</button>
                  <h3>Dodaj novo vozilo</h3>
                  <input
                    type="text"
                    name="registracija"
                    placeholder="Registracijska oznaka"
                    value={novoVozilo.registracija}
                    onChange={handleInputChange}
                  />
                  <input
                    type="text"
                    name="model"
                    placeholder="Model"
                    value={novoVozilo.model}
                    onChange={handleInputChange}
                  />
                  <input
                    type="text"
                    name="datum"
                    placeholder="Datum registracije (npr. 27.09.2027)"
                    value={novoVozilo.datum}
                    onChange={handleInputChange}
                  />
                  <div className="modal-actions">
                    <button onClick={handleAddVozilo}>Dodaj</button>
                  </div>
                </div>
              </div>
            )}

          </div>
        );

      case 'rezervacije':
        return (
          <div className="rezervacije-section">
            <table className="rezervacije-table">
              <thead>
                <tr>
                  <th>Termin</th>
                  <th>Zaposlenik</th>
                  <th>Dodijeljeno vozilo</th>
                  <th>Prijavljeni problem</th>
                  <th>Status</th>
                  <th>Akcije</th>
                </tr>
              </thead>
              <tbody>
                {rezervacije.map((rez) => (
                  <tr key={rez._id}>
                    <td>
                      {new Date(rez.startDate).toLocaleDateString()} – {new Date(rez.endDate).toLocaleDateString()}
                    </td>
                    <td>
                      {rez.employeeId
                        ? `${rez.employeeId.name} (${rez.employeeId.email})`
                        : 'Nepoznato'}
                    </td>
                    <td>
                      {rez.assignedVehicle
                        ? `${rez.assignedVehicle.name} (${rez.assignedVehicle.type})`
                        : 'Nije dodijeljeno'}
                    </td>
                    <td>
                      {
                        (() => {
                          const problem = problemi.find(
                            p => p.reservation && String(p.reservation._id) === String(rez._id)
                          );
                          return problem ? problem.description : 'Nema prijavljenog problema';
                        })()
                      }
                    </td>
                    <td>
                      {rez.status === 'pending' ? (
                        <>
                          <button onClick={() => promijeniStatus(rez._id, 'approved')}>Prihvati</button>
                          <button onClick={() => promijeniStatus(rez._id, 'rejected')}>Odbij</button>
                        </>
                      ) : rez.status === 'approved' && !rez.assignedVehicle ? (
                        <>
                          <select
                            onChange={(e) => dodijeliVozilo(rez._id, e.target.value)}
                            defaultValue=""
                          >
                            <option value="" disabled>Odaberite vozilo</option>
                            {dostupnaVozila.map((vozilo) => (
                              <option key={vozilo._id} value={vozilo._id}>
                                {vozilo.name} ({vozilo.type})
                              </option>
                            ))}
                          </select>
                        </>
                      ) : rez.status === 'vehicle assigned' && rez.assignedVehicle ? (
                        <span style={{ color: 'green' }}>Dodijeljeno</span>
                      ) : (
                        <span style={{ color: 'gray' }}>Odbijeno</span>
                      )}
                    </td>
                    <td>
                      <button onClick={() => obrisiRezervaciju(rez._id)}><FontAwesomeIcon icon={faTrash} style={{ fontSize: '18px' }} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'biljeske':
        return (
          <div className="biljeske-section">
            <div className="biljeske-header">
              <h3>Bilješke</h3>
              <button
                onClick={() => {
                  setNovaBiljeska({ ime: '', datum: today, opis: '' });
                  setUrediId(null);
                  setShowBiljeskaModal(true);
                }}
                className="btn-secondary"
              >
                Dodaj novu bilješku
              </button>
            </div>

            <div className="biljeske-lista">
              {biljeske.map((biljeska, index) => (
                <div className="biljeska-kartica" key={biljeska._id}>
                  <p><strong>Ime:</strong> {biljeska.ime}</p>
                  <p><strong>Datum:</strong> {new Date(biljeska.datum).toLocaleDateString()}</p>
                  <p><strong>Opis:</strong> {biljeska.opis}</p>
                  <div className="biljeska-actions">
                    <button onClick={() => urediBiljesku(index)}>Uredi</button>
                    <button onClick={() => obrisiBiljesku(index)}>Izbriši</button>
                  </div>
                </div>
              ))}
            </div>

            {showBiljeskaModal && (
              <div className="modal-overlay">
                <div className="modal">
                  <h3>{urediId !== null ? 'Uredi bilješku' : 'Nova bilješka'}</h3>
                  <input
                    type="text"
                    name="ime"
                    placeholder="Ime admina"
                    value={novaBiljeska.ime}
                    onChange={handleChangeBiljeska}
                  />
                  <input
                    type="date"
                    name="datum"
                    value={novaBiljeska.datum}
                    onChange={handleChangeBiljeska}
                  />
                  <textarea
                    name="opis"
                    placeholder="Opis bilješke"
                    value={novaBiljeska.opis}
                    onChange={handleChangeBiljeska}
                  />
                  <div className="modal-actions">
                    <button onClick={spremiBiljesku}>Spremi</button>
                    <button
                      onClick={() => {
                        setShowBiljeskaModal(false);
                        setNovaBiljeska({ ime: '', datum: today, opis: '' });
                        setUrediId(null);
                      }}
                    >
                      Odustani
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );


      case 'kalendar':
        return (
          <div className="kalendar-wrapper">
            <div className="kalendar-section">
              <Calendar
                locale="hr-HR"
                onChange={(date) => setSelectedDate(date)}
                value={selectedDate}
                calendarType="iso8601"
                tileClassName={({ date, view }) => {
                  if (view === 'month') {
                    const iso = date.toISOString().split('T')[0];
                    const hasRez = rezervacije.some(r =>
                      jeDatumURasponu(iso, r.startDate, r.endDate)
                    );
                    const hasBilj = biljeske.some(b => {
                      const biljeskaDate = new Date(b.datum).toISOString().split('T')[0];
                      return biljeskaDate === iso;
                    });

                    if (hasRez && hasBilj) return 'both-events';
                    if (hasRez) return 'has-rezervacija';
                    if (hasBilj) return 'has-biljeska';
                  }
                  return null;
                }}
                formatShortWeekday={(locale, date) =>
                  date.toLocaleDateString('hr-HR', { weekday: 'short' }).replace('.', '')
                }
                tileContent={({ date, view }) => {
                  if (view === 'month') {
                    const iso = date.toISOString().split('T')[0];
                    const w = weatherData[iso];
                    if (w) {
                      return (
                        <div className="tile-weather">
                          <span>{w.icon}</span>
                          <small>{w.temp}</small>
                        </div>
                      );
                    }
                  }
                  return null;
                }}
              />

              {selectedDate && (
                <div className="popup-overlay" onClick={() => setSelectedDate(null)}>
                  <div className="popup-content" onClick={e => e.stopPropagation()}>
                    <button className="popup-close" onClick={() => setSelectedDate(null)}>✖</button>
                    <h3>{selectedDate.toLocaleDateString('hr-HR')}</h3>

                    {rezervacije
                      .filter(r => jeDatumURasponu(selectedDate.toISOString().split('T')[0], r.startDate, r.endDate))
                      .map((r, i) => (
                        <p key={`rez-${i}`}>
                          🔵 Rezervacija: {r.employeeId?.name || 'Nepoznato'}, {r.assignedVehicle?.name || 'Bez vozila'}
                        </p>
                      ))}

                    {biljeske
                      .filter(b => {
                        const biljeskaDate = new Date(b.datum).toISOString().split('T')[0];
                        const selected = selectedDate.toISOString().split('T')[0];
                        return biljeskaDate === selected;
                      })
                      .map((b, i) => (
                        <p key={`bilj-${i}`}>🟢 Bilješka: {b.ime}, {b.opis}</p>
                      ))}
                  </div>
                </div>
              )}
            </div>

            <div className="desna-strana">
              <DigitalClock />
              <StatisticsPanel rezervacije={rezervacije} biljeske={biljeske} />
              <LegendPanel />
            </div>
          </div>
        );

      default:
        return (
          <div className="placeholder">
            <h2>Dobrodošli!</h2>
            <p>Odaberite kategoriju kako biste započeli.</p>
            <img
              src="/public/slika_vozila.webp"
              alt="Pozdravna ilustracija"
              className="placeholder-image"
            />
          </div>
        );
    }
  };

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <div className="header-left">
          <img src="/public/dd_logo1.png" alt="Logo" className="logo" />
          <h2>Bok, {adminName}</h2>
        </div>
        <div className="header-right">
          <button title="Promjena teme" onClick={() => setDarkMode(prev => !prev)}>
            {/* {darkMode ? '🌞' : '🌙'} */} <FontAwesomeIcon
              icon={darkMode ? faSun : faMoon}
              style={{ color: darkMode ? '#fff' : '#000' }}
            />
          </button>

          <div className="notification-wrapper">
            <button onClick={() => setPrikaziObavijesti(prev => !prev)} className="notification-button">
              <FontAwesomeIcon icon={faBell} />
              {obavijesti.length > 0 && <span className="notification-count">{obavijesti.length}</span>}
            </button>

            {prikaziObavijesti && (
              <div className="notifikacije-popup">
                <h4>Registracije vozila</h4>
                {obavijesti.length === 0 ? (
                  <p>Nema obavijesti.</p>
                ) : (
                  <ul>
                    {obavijesti.map((o, i) => (
                      <li key={i}>
                        <FontAwesomeIcon icon={faCar} style={{ marginRight: '5px' }} />
                        <strong>{o.vozilo}</strong> – istječe za {o.danaDo} dana ({new Date(o.datum).toLocaleDateString()})
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
          <div className="notification-wrapper">
            <button onClick={() => setShowProfilePopup(!showProfilePopup)}>
              <FontAwesomeIcon icon={faUser} style={{ color: darkMode ? '#fff' : '#000' }} />
            </button>
            {showProfilePopup && (
              <ProfilePopup
                name={adminName}
                email={adminEmail}
                onLogout={handleLogout}
                onClose={() => setShowProfilePopup(false)}
              />
            )}

          </div>

        </div>
      </header>

      <nav className="admin-tabs">
        <button onClick={() => setActiveTab('vozila')} className={activeTab === 'vozila' ? 'active' : ''}>VOZILA</button>
        <button onClick={() => setActiveTab('rezervacije')} className={activeTab === 'rezervacije' ? 'active' : ''}>REZERVACIJE</button>
        <button onClick={() => setActiveTab('biljeske')} className={activeTab === 'biljeske' ? 'active' : ''}>BILJEŠKE</button>
        <button onClick={() => setActiveTab('kalendar')} className={activeTab === 'kalendar' ? 'active' : ''}>KALENDAR</button>
      </nav>

      <main className="admin-content">
        {renderContent()}
      </main>

      <footer className="admin-footer">
        <strong>Digitalna Dalmacija</strong><br />
        Ul. Ruđera Boškovića 25
        <br />21000, Split
      </footer>
    </div>
  );
};

export default AdminDashboard;
