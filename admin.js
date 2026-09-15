const express = require('express');
const Vehicle = require('./Vehicle');
const Reservation = require('./Reservation');
const Issue = require('./Issue');
const router = express.Router();
const mongoose = require('mongoose');
const Note = require('./Note'); // Bilješke sekcija
const User = require('./User');
const bcrypt = require('bcryptjs');


// Manage reservations
router.get('/reservations', async (req, res) => {
  try {
    // Dohvaćanje rezervacija i popunjavanje podataka o dodijeljenom vozilu
    const reservations = await Reservation.find()
      .populate('assignedVehicle', 'name type')
      .populate('employeeId', 'name email');

    console.log(`Pronađeno ${reservations.length} rezervacija.`);
    res.status(200).json(reservations);
  } catch (error) {
    console.error('Greška prilikom dohvaćanja rezervacija:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});


// Update status rezervacije--> NOVO
router.put('/reservations/:id/assign', async (req, res) => {
  const { vehicleId, status } = req.body;

  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) {
      return res.status(404).json({ message: 'Rezervacija nije pronađena' });
    }

    // Dodjela vozila i status
    reservation.assignedVehicle = vehicleId;
    reservation.status = status || 'vehicle assigned';
    await reservation.save();

    // Vozilo postaje zauzeto
    await Vehicle.findByIdAndUpdate(vehicleId, { status: 'unavailable' });

    // Vraćamo ažuriranu rezervaciju s popunjenim vozilom
    const updated = await Reservation.findById(reservation._id)
      .populate('assignedVehicle', 'name type');

    res.status(200).json(updated);
  } catch (err) {
    console.error('Greška pri dodjeli vozila:', err.message);
    res.status(500).json({ message: 'Greška na serveru', error: err.message });
  }
});


// Update status rezervacije
router.put('/reservations/:id', async (req, res) => {
  const { status } = req.body;

  try {
    const reservation = await Reservation.findById(req.params.id);

    if (!reservation) {
      return res.status(404).json({ message: 'Rezervacija nije pronađena' });
    }

    // Obrada statusnih vrijednosti
    if (['rejected', 'canceled', 'cancelled by user'].includes(status)) {
      console.log('Ažuriranje statusa vozila na "available" za vozilo:', reservation.assignedVehicle);
      if (reservation.assignedVehicle) {
        await Vehicle.findByIdAndUpdate(reservation.assignedVehicle, { status: 'available' });
      }
      reservation.assignedVehicle = null;
      console.log('Vozilo postavljeno na "available".');
    }

    // Dodjela vozila
    if (status === 'vehicle assigned' && req.body.vehicleId) {
      console.log('Dodjeljivanje vozila:', req.body.vehicleId);
      reservation.assignedVehicle = req.body.vehicleId;
      await Vehicle.findByIdAndUpdate(req.body.vehicleId, { status: 'unavailable' });
    }

    reservation.status = status;
    await reservation.save();

    res.status(200).json({ message: `Rezervacija ažurirana na: ${status}`, reservation });
  } catch (error) {
    console.error('Greška pri ažuriranju rezervacije:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});


router.post('/reservations', async (req, res) => {
  const { vehicleType, startDate, endDate, employeeId } = req.body;

  try {
    const reservation = new Reservation({
      vehicleType,
      startDate,
      endDate,
      employeeId, // Dodavanje employeeId
      status: 'pending',
    });
    await reservation.save();
    res.status(201).json({ message: 'Rezervacija uspješno kreirana', reservation });
  } catch (error) {
    console.error('Greška pri kreiranju rezervacije:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Upravljanje vozilima
router.get('/vehicles', async (req, res) => {
  try {
    const vehicles = await Vehicle.find(); // Dohvaćanje svih vozila
    res.status(200).json(vehicles);
  } catch (error) {
    console.error('Greška prilikom dohvaćanja vozila:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Obavijesti o nadolazećim registracijama vozila (npr. unutar 7 dana)
router.get('/vehicles/upcoming-registration', async (req, res) => {
  try {
    const today = new Date();
    const next7Days = new Date();
    next7Days.setDate(today.getDate() + 7);

    const vozila = await Vehicle.find({
      registrationExpiryDate: { $gte: today, $lte: next7Days }
    });

    const obavijesti = vozila.map(v => {
      const danaDo = Math.ceil((new Date(v.registrationExpiryDate) - today) / (1000 * 60 * 60 * 24));
      return {
        id: v._id,
        vozilo: `${v.type} (${v.name})`,
        datum: v.registrationExpiryDate,
        danaDo
      };
    });

    res.json(obavijesti);
  } catch (err) {
    console.error("Greška kod dohvaćanja registracijskih obavijesti:", err);
    res.status(500).json({ message: "Greška na serveru." });
  }
});


router.post('/vehicles', async (req, res) => {
  const { type, name, status, registrationExpiryDate } = req.body;

  if (!type || !name || !registrationExpiryDate) {
    return res.status(400).json({ message: 'Model, registracijska oznaka i datum registracije su obavezni.' });
  }

  const parsedRegistrationDate = new Date(registrationExpiryDate);
  if (Number.isNaN(parsedRegistrationDate.getTime())) {
    return res.status(400).json({ message: 'Datum registracije nije ispravan.' });
  }

  try {
    const vehicle = new Vehicle({
      type: String(type).trim(),
      name: String(name).trim().toUpperCase(),
      status: status || 'available',
      registrationExpiryDate: parsedRegistrationDate,
    });

    await vehicle.save();
    res.status(201).json({ message: 'Vozilo uspješno dodano.', vehicle });
  } catch (error) {
    console.error('Greška pri dodavanju vozila:', error.message);
    res.status(500).json({ message: 'Server greška pri dodavanju vozila.', error: error.message });
  }
});


router.put('/vehicles/:id', async (req, res) => {
  try {
    const updates = req.body;
    const vehicle = await Vehicle.findByIdAndUpdate(req.params.id, updates, { new: true });
    res.json(vehicle);
  } catch (err) {
    res.status(500).json({ error: 'Greška pri ažuriranju vozila.' });
  }
});

// Dodavanj podsjetnika za maintenance
router.get('/maintenance/reminders', async (req, res) => {
  try {
    const today = new Date();
    const upcomingMaintenance = await Vehicle.find({
      lastMaintenance: { $lte: new Date(today.getFullYear(), today.getMonth() - 1, today.getDate()) },
    });
    res.json(upcomingMaintenance);
  } catch (err) {
    res.status(500).json({ error: 'Greška pri dohvaćanju podsjetnika za održavanje.' });
  }
});

// Pregled problema
router.get('/issues', async (req, res) => {
  try {
    const issues = await Issue.find()
      .populate('vehicleId', 'name type')
      .populate('reportedBy', 'name')
      .populate('reservation', 'startDate endDate');

    res.status(200).json(issues);
  } catch (error) {
    console.error('Greška pri dohvaćanju prijavljenih problema:', error);
    res.status(500).json({ message: 'Server greška pri dohvaćanju prijavljenih problema.' });
  }
});

// Approve ili reject problem
router.put('/issues/:id', async (req, res) => {
  const { status } = req.body;

  if (!['resolved', 'rejected'].includes(status)) {
    return res.status(400).json({ message: 'Nevažeća statusna vrijednost.' });
  }

  try {
    const issue = await Issue.findById(req.params.id).populate('vehicleId');

    if (!issue) {
      return res.status(404).json({ message: 'Prijavljeni problem zaposlenika nije pronađen.' });
    }

    if (status === 'resolved' && issue.vehicleId) {
      await Vehicle.findByIdAndUpdate(issue.vehicleId._id, { status: 'available' });
    }

    issue.status = status;
    await issue.save();

    res.status(200).json({ message: `Prijavljeni problem označen kao: ${status}`, issue });
  } catch (error) {
    console.error('Greška pri ažuriranju statusa prijavljenog problema:', error.message);
    res.status(500).json({ message: 'Server greška tiekom ažuriranja prijavljenog problema.' });
  }
});



// Dohvaćanje svih prijavljenih problema za administratora
router.get('/admin/issues', async (req, res) => {
  try {
    const issues = await Issue.find()
      .populate('vehicleId')
      .populate('reportedBy')
      .populate('reservation'); // Uključivanje rezervacija za administraciju
    res.status(200).json(issues);
  } catch (error) {
    console.error('Greška pri dohvaćanju prijavljenih problema:', error);
    res.status(500).json({ message: 'Server greška tijekom dohvaćanja prijavljenih problema.' });
  }
});

const handleExpiredReservations = async () => {
  try {
    const now = new Date();

    //Pronalazi sve rezervacije koje su istekle, ali su još uvijek označene kao aktivne
    const expiredReservations = await Reservation.find({
      endDate: { $lt: now },
      status: 'vehicle assigned',
    });

    for (const reservation of expiredReservations) {
      // Postavlja vozilo natrag na dostupno
      if (reservation.assignedVehicle) {
        await Vehicle.findByIdAndUpdate(reservation.assignedVehicle, { status: 'available' });
      }

      // Update status rezervacije
      reservation.status = 'expired';
      reservation.assignedVehicle = null;
      await reservation.save();
    }

    console.log(`${expiredReservations.length} istekla rezervacija obrađena.`);
  } catch (error) {
    console.error('Greška pri rukovanju istekle rezervacije:', error);
  }
};

// Pokreće provjeru svakih sat vremena
setInterval(handleExpiredReservations, 60 * 60 * 1000);

router.delete('/reservations/:id', async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);

    if (!reservation) {
      return res.status(404).json({ message: 'Rezervacija nije pronađena.' });
    }

    if (reservation.assignedVehicle) {
      await Vehicle.findByIdAndUpdate(reservation.assignedVehicle, { status: 'available' });
    }

    await Reservation.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Rezervacija izbrisana uspješno.' });
  } catch (error) {
    console.error('Greška pri brisanju rezervacije:', error.message);
    res.status(500).json({ message: 'Server greška tijekom brisanja rezervacije.' });
  }
});

//Delete vozilo
router.delete('/vehicles/:id', async (req, res) => {
  try {
    // Provjeri je li vozilo u aktivnoj rezervaciji
    const aktivnaRezervacija = await Reservation.findOne({
      assignedVehicle: req.params.id,
      status: { $in: ['vehicle assigned', 'approved'] }
    });

    if (aktivnaRezervacija) {
      return res.status(400).json({ message: 'Ne možete obrisati vozilo koje je aktivno u rezervaciji.' });
    }

    // Briši vozilo ako nije u aktivnoj rezervaciji
    const vozilo = await Vehicle.findByIdAndDelete(req.params.id);

    if (!vozilo) {
      return res.status(404).json({ message: 'Vozilo nije pronađeno.' });
    }

    res.status(200).json({ message: 'Vozilo uspješno obrisano.' });
  } catch (error) {
    console.error('Greška pri brisanju vozila:', error.message);
    res.status(500).json({ message: 'Server greška tijekom brisanja vozila.' });
  }
});


// Delete problem
router.delete('/issues/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Pronađi i izbriši problem
    const issue = await Issue.findByIdAndDelete(id);

    if (!issue) {
      return res.status(404).json({ message: 'Prijavljeni problem nije pronađen.' });
    }

    res.status(200).json({ message: 'Prijavljeni problem je uspješno izbrisan.' });
  } catch (error) {
    console.error('Greška pri brisanju rezervacije:', error.message);
    res.status(500).json({ message: 'Server greška tijekom brisanja rezervacije.' });
  }
});

router.post('/reservations/check-expired', async (req, res) => {
  try {
    await handleExpiredReservations();
    res.status(200).json({ message: 'Istekle rezervacije ažurirane.' });
  } catch (error) {
    console.error('Greška pri ručnom pokretanju provjere isteklih rezervacija:', error);
    res.status(500).json({ message: 'Greška tijekom ažuriranja isteklih rezervacija.' });
  }
});


// Rute za sekciju Bilješke

// Dohvati sve bilješke
router.get('/notes', async (req, res) => {
  try {
    const notes = await Note.find().sort({ datum: -1 });
    res.json(notes);
  } catch (err) {
    res.status(500).json({ message: 'Greška pri dohvaćanju bilješki.' });
  }
});

// Dodaj novu bilješku
router.post('/notes', async (req, res) => {
  try {
    const nova = new Note(req.body);
    await nova.save();
    res.status(201).json(nova);
  } catch (err) {
    res.status(500).json({ message: 'Greška pri spremanju bilješke.' });
  }
});

// Ažuriraj bilješku
router.put('/notes/:id', async (req, res) => {
  try {
    const updated = await Note.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Greška pri ažuriranju bilješke.' });
  }
});

// Izbriši bilješku
router.delete('/notes/:id', async (req, res) => {
  try {
    await Note.findByIdAndDelete(req.params.id);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ message: 'Greška pri brisanju bilješke.' });
  }
});

// Spremanje / ažuriranje profilne slike
router.post('/profile-image', async (req, res) => {
  const { email, image } = req.body;

  if (!email || !image) {
    return res.status(400).json({ message: 'Email i slika su obavezni.' });
  }

  try {
    const user = await User.findOneAndUpdate(
      { email },
      { profileImage: image },
      { new: true, upsert: false } // upsert false jer korisnik mora postojati
    );

    if (!user) {
      return res.status(404).json({ message: 'Korisnik nije pronađen.' });
    }

    res.json({ message: 'Slika uspješno spremljena.' });
  } catch (err) {
    console.error('Greška prilikom spremanja slike:', err);
    res.status(500).json({ message: 'Greška na serveru.' });
  }
});

// Rute za profil ikonu
// Dohvat slike
router.get('/profile-image/:email', async (req, res) => {
  const { email } = req.params;

  try {
    const user = await User.findOne({ email });

    if (!user || !user.profileImage) {
      return res.status(404).json({ message: 'Slika nije pronađena.' });
    }

    res.json({ image: user.profileImage });
  } catch (err) {
    console.error('Greška prilikom dohvaćanja slike:', err);
    res.status(500).json({ message: 'Greška na serveru.' });
  }
});

// DELETE /api/admin/delete-profile/:email
router.delete('/delete-profile/:email', async (req, res) => {
  const { email } = req.params;

  try {
    const user = await User.findOneAndDelete({ email });

    if (!user) {
      return res.status(404).json({ message: 'Korisnik nije pronađen.' });
    }

    res.status(200).json({ message: 'Profil uspješno obrisan.' });
  } catch (error) {
    console.error('Greška pri brisanju profila:', error);
    res.status(500).json({ message: 'Došlo je do greške.' });
  }
});

// PUT /api/admin/change-password
router.put('/change-password', async (req, res) => {
  const { email, currentPassword, newPassword } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'Korisnik nije pronađen.' });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Trenutna lozinka nije točna.' });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    //console.log(`Nova lozinka za korisnika ${email}: ${newPassword}`);

    await user.save();

    res.status(200).json({ message: 'Lozinka uspješno promijenjena.' });
  } catch (err) {
    res.status(500).json({ message: 'Greška na serveru.' });
  }
});


module.exports = router;
