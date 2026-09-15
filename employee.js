const express = require('express');
const Reservation = require('./Reservation');
const Issue = require('./Issue');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('./User');
const bcrypt = require('bcryptjs');

// Kreiranje rezervacije
router.post('/reservations', async (req, res) => {
  const { employeeId, vehicleType, startDate, endDate, purpose } = req.body;

  try {
    console.log('Podaci iz zahtjeva:', { employeeId, vehicleType, startDate, endDate, purpose });

    // Provjera validnosti employeeId
    if (!employeeId || !mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(400).json({ message: 'Neispravan ili nedostaje employee ID.' });
    }

    // Provjera vrste vozila
    if (!vehicleType || typeof vehicleType !== 'string') {
      return res.status(400).json({ message: 'Neispravan ili nedostaje tip vozila rezervacije.' });
    }

    // Provjera početnog datuma
    if (!startDate || isNaN(Date.parse(startDate))) {
      return res.status(400).json({ message: 'Neispravan ili nedostaje početni datum rezervacije.' });
    }

    // Provjera završnog datuma
    if (!endDate || isNaN(Date.parse(endDate))) {
      return res.status(400).json({ message: 'Neispravan ili nedostaje krajnji datum rezervacije.' });
    }

    // Provjera da početni datum bude prije završnog
    if (new Date(startDate) >= new Date(endDate)) {
      return res.status(400).json({ message: 'Početni datum mora biti prije krajnjeg datuma rezervacije.' });
    }

    // Provjera svrhe rezervacije
    if (!purpose || typeof purpose !== 'string') {
      return res.status(400).json({ message: 'Neispravan ili nedostaje svrha rezervacije.' });
    }

    // Pretvaranje employeeId u validni ObjectId
    const validEmployeeId = new mongoose.Types.ObjectId(employeeId);

    // Kreiranje nove rezervacije
    const reservation = new Reservation({
      employeeId: validEmployeeId,
      vehicleType,
      startDate,
      endDate,
      purpose,
    });

    console.log('Kreiram rezervaciju:', reservation);

    await reservation.save();
    res.status(201).json({ message: 'Rezervacija uspješno kreirana' });
  } catch (error) {
    console.error('Greška prilikom kreiranja rezervacije:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Fetch employee rezervacije
router.get('/reservations/:employeeId', async (req, res) => {
  const { employeeId } = req.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(400).json({ message: 'Neispravan employee ID format' });
    }

    console.log('Dohvaćanje rezervacija za employeeId:', employeeId);

    const reservations = await Reservation.find({ employeeId: new mongoose.Types.ObjectId(employeeId) })
      .populate('assignedVehicle', 'name type'); // Populate assigned vehicle details

    console.log(`Pronađeno ${reservations.length} rezervacija za zaposlenika ${employeeId}`);
    res.status(200).json(reservations);
  } catch (error) {
    console.error('Greška prilikom dohvaćanja rezervacija:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


// Cancel rezervacija
router.delete('/reservations/:id', async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) {
      return res.status(404).json({ message: 'Rezervacija nije pronađena.' });
    }

    if (new Date() < reservation.startDate) {
      // Umjesto brisanja, ažurira status na "cancelled by user"
      reservation.status = 'cancelled by user';
      await reservation.save();
      return res.json({ message: 'Rezervacija otkazana uspješno.' });
    } else {
      return res.status(400).json({ message: 'Ne možete otkazati rezervaciju nakon što je započela.' });
    }
  } catch (error) {
    console.error('Greška prilikom otkazivanja rezervacije:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update status rezervacije 
router.put('/reservations/:id', async (req, res) => {
  const { status } = req.body;

  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) {
      return res.status(404).json({ message: 'Rezervacija nije pronađena.' });
    }

    // Provjera ako zaposlenik pokušava otkazati rezervaciju nakon početka
    if (status === 'cancelled by user' && new Date() >= reservation.startDate) {
      return res.status(400).json({ message: 'Ne možete obrisati rezervaciju nakon što je započela.' });
    }

    // Ažuriranje statusa
    reservation.status = status;
    await reservation.save();

    res.status(200).json({ message: 'Status rezervacije uspješno ažuriran.', reservation });
  } catch (error) {
    console.error('Greška prilikom ažuriranja statusa rezervacije:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Report problem
router.post('/report-problem', async (req, res) => {
  const { reservationId, description } = req.body;

  if (!reservationId || !description) {
    return res.status(400).json({ message: 'Reservation ID i opis su obavezni prilikom prijave problema.' });
  }

  try {
    // Dohvaća rezervaciju i popuni podatke o dodijeljenom vozilu
    const reservation = await Reservation.findById(reservationId).populate('assignedVehicle');

    if (!reservation) {
      return res.status(404).json({ message: 'Rezervacija nije pronađena.' });
    }

    // Kreiranje problema i povezivanje s dodijeljenim vozilom
    const issue = new Issue({
      vehicleId: reservation.assignedVehicle, 
      description,
      reportedBy: reservation.employeeId,
      reservation: reservation._id,
    });

    await issue.save();

    res.status(201).json({ message: 'Problem uspješno prijavljen.', issue });
  } catch (error) {
    console.error('Greška prilikom prijave problema:', error);
    res.status(500).json({ message: 'Server greška prilikom prijave problema.' });
  }
});


// ===== PROFIL ZAPOSLENIKA =====
// Iste mogućnosti profila kao kod administratora: slika, promjena lozinke i brisanje profila.
router.post('/profile-image', async (req, res) => {
  const { email, image } = req.body;

  if (!email || !image) {
    return res.status(400).json({ message: 'Email i slika su obavezni.' });
  }

  try {
    const user = await User.findOneAndUpdate(
      { email, role: 'employee' },
      { profileImage: image },
      { new: true, upsert: false }
    );

    if (!user) {
      return res.status(404).json({ message: 'Zaposlenik nije pronađen.' });
    }

    res.json({ message: 'Slika uspješno spremljena.' });
  } catch (err) {
    console.error('Greška prilikom spremanja slike zaposlenika:', err);
    res.status(500).json({ message: 'Greška na serveru.' });
  }
});

router.get('/profile-image/:email', async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.email, role: 'employee' });

    if (!user || !user.profileImage) {
      return res.status(404).json({ message: 'Slika nije pronađena.' });
    }

    res.json({ image: user.profileImage });
  } catch (err) {
    console.error('Greška prilikom dohvaćanja slike zaposlenika:', err);
    res.status(500).json({ message: 'Greška na serveru.' });
  }
});

router.delete('/delete-profile/:email', async (req, res) => {
  try {
    const user = await User.findOneAndDelete({ email: req.params.email, role: 'employee' });

    if (!user) {
      return res.status(404).json({ message: 'Zaposlenik nije pronađen.' });
    }

    res.status(200).json({ message: 'Profil uspješno obrisan.' });
  } catch (error) {
    console.error('Greška pri brisanju profila zaposlenika:', error);
    res.status(500).json({ message: 'Došlo je do greške.' });
  }
});

router.put('/change-password', async (req, res) => {
  const { email, currentPassword, newPassword } = req.body;

  if (!email || !currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Sva polja su obavezna.' });
  }

  try {
    const user = await User.findOne({ email, role: 'employee' });
    if (!user) return res.status(404).json({ message: 'Zaposlenik nije pronađen.' });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Trenutna lozinka nije točna.' });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.status(200).json({ message: 'Lozinka uspješno promijenjena.' });
  } catch (err) {
    console.error('Greška pri promjeni lozinke zaposlenika:', err);
    res.status(500).json({ message: 'Greška na serveru.' });
  }
});


module.exports = router;
