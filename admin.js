const express = require('express');
const Vehicle = require('./Vehicle');
const Reservation = require('./Reservation');
const Issue = require('./Issue');
const router = express.Router();
const mongoose = require('mongoose');

// Manage reservations
router.get('/reservations', async (req, res) => {
  try {
    // Dohvaćanje rezervacija i popunjavanje podataka o dodijeljenom vozilu
    const reservations = await Reservation.find().populate('assignedVehicle', 'name type');
    console.log(`Pronađeno ${reservations.length} rezervacija.`);
    res.status(200).json(reservations);
  } catch (error) {
    console.error('Greška prilikom dohvaćanja rezervacija:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
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

router.post('/vehicles', async (req, res) => {
  const { type, name, status, registrationExpiryDate } = req.body;

  if (!type || !name || !registrationExpiryDate) {
    return res.status(400).json({ message: 'Tip, registracijska oznaka i datum registracije su obavezni.' });
  }

  try {
    const vehicle = new Vehicle({ type, name, status: status || 'available', registrationExpiryDate });
    await vehicle.save();
    res.status(201).json({ message: 'Vozilo uspješno dodano.', vehicle });
  } catch (error) {
    console.error('Greška pri dodavanju vozila:', error.message);
    res.status(500).json({ message: 'Server greška', error: error.message });
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



// Dodavanje novog vozila na listu dostupnih vozila
router.post('/vehicles', async (req, res) => {
  const { type, model, registrationNumber } = req.body;

  try {
    const vehicle = new Vehicle({ type, model, registrationNumber });
    await vehicle.save();

    res.status(201).json({ message: 'Vozilo dodano uspješno', vehicle });
  } catch (error) {
    console.error('Greška pri dodavanju vozila:', error);
    res.status(500).json({ message: 'Server greška tijekom dodavanju vozila.' });
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



module.exports = router;
