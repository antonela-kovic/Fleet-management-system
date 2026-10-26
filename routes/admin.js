const express = require('express');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const Vehicle = require('../models/Vehicle');
const Reservation = require('../models/Reservation');
const Issue = require('../models/Issue');
const Note = require('../models/Note');
const User = require('../models/User');
const { expireFinishedReservations } = require('../services/reservations');

// Admin routes. All of them require a valid token with the "admin" role (see server.js).
const router = express.Router();

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg });
  }
  return next();
};

const rejectInvalidId = (req, res, next) => {
  if (!isValidId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid ID.' });
  }
  return next();
};

const releaseVehicle = async (vehicleId) => {
  if (vehicleId) {
    await Vehicle.findByIdAndUpdate(vehicleId, { status: 'available' });
  }
};

/* ===== Reservations ===== */

// GET /api/admin/reservations
router.get('/reservations', async (req, res, next) => {
  try {
    const reservations = await Reservation.find()
      .populate('assignedVehicle', 'name type')
      .populate('employeeId', 'name email')
      .sort({ startDate: -1 });
    return res.json(reservations);
  } catch (error) {
    return next(error);
  }
});

// PUT /api/admin/reservations/:id
// Body: { status } to approve or reject, or { status: "vehicle assigned", vehicleId } to assign a vehicle.
router.put(
  '/reservations/:id',
  rejectInvalidId,
  body('status').isIn(['approved', 'rejected', 'vehicle assigned']).withMessage('Invalid status.'),
  validate,
  async (req, res, next) => {
    const { status, vehicleId } = req.body;

    try {
      const reservation = await Reservation.findById(req.params.id);
      if (!reservation) {
        return res.status(404).json({ message: 'Reservation not found.' });
      }

      if (status === 'rejected') {
        await releaseVehicle(reservation.assignedVehicle);
        reservation.assignedVehicle = null;
      }

      if (status === 'vehicle assigned') {
        if (!isValidId(vehicleId)) {
          return res.status(400).json({ message: 'A valid vehicle ID is required.' });
        }
        // Atomically take the vehicle only if it is still available.
        const vehicle = await Vehicle.findOneAndUpdate(
          { _id: vehicleId, status: 'available' },
          { status: 'unavailable' },
          { new: true }
        );
        if (!vehicle) {
          return res.status(409).json({ message: 'The vehicle is not available.' });
        }
        await releaseVehicle(reservation.assignedVehicle);
        reservation.assignedVehicle = vehicle._id;
      }

      reservation.status = status;
      await reservation.save();
      await reservation.populate('assignedVehicle', 'name type');

      return res.json({ message: `Reservation updated: ${status}.`, reservation });
    } catch (error) {
      return next(error);
    }
  }
);

// DELETE /api/admin/reservations/:id
router.delete('/reservations/:id', rejectInvalidId, async (req, res, next) => {
  try {
    const reservation = await Reservation.findByIdAndDelete(req.params.id);
    if (!reservation) {
      return res.status(404).json({ message: 'Reservation not found.' });
    }
    await releaseVehicle(reservation.assignedVehicle);
    return res.json({ message: 'Reservation deleted.' });
  } catch (error) {
    return next(error);
  }
});

// POST /api/admin/reservations/check-expired - runs the expiry check on demand
router.post('/reservations/check-expired', async (req, res, next) => {
  try {
    const count = await expireFinishedReservations();
    return res.json({ message: `${count} expired reservation(s) updated.` });
  } catch (error) {
    return next(error);
  }
});

/* ===== Vehicles ===== */

// GET /api/admin/vehicles
router.get('/vehicles', async (req, res, next) => {
  try {
    return res.json(await Vehicle.find().sort({ name: 1 }));
  } catch (error) {
    return next(error);
  }
});

// GET /api/admin/vehicles/upcoming-registration - registrations expiring within 7 days
router.get('/vehicles/upcoming-registration', async (req, res, next) => {
  try {
    const today = new Date();
    const inSevenDays = new Date();
    inSevenDays.setDate(today.getDate() + 7);

    const vehicles = await Vehicle.find({ registrationExpiryDate: { $gte: today, $lte: inSevenDays } });
    const notifications = vehicles.map((v) => ({
      id: v._id,
      vehicle: `${v.type} (${v.name})`,
      date: v.registrationExpiryDate,
      daysLeft: Math.ceil((v.registrationExpiryDate - today) / (1000 * 60 * 60 * 24)),
    }));

    return res.json(notifications);
  } catch (error) {
    return next(error);
  }
});

// POST /api/admin/vehicles
router.post(
  '/vehicles',
  [
    body('type').isString().trim().notEmpty().withMessage('Model is required.'),
    body('name').isString().trim().notEmpty().withMessage('Licence plate is required.'),
    body('registrationExpiryDate').isISO8601().withMessage('Invalid registration date.'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const vehicle = await Vehicle.create({
        type: req.body.type,
        name: req.body.name,
        registrationExpiryDate: req.body.registrationExpiryDate,
      });
      return res.status(201).json({ message: 'Vehicle added.', vehicle });
    } catch (error) {
      return next(error);
    }
  }
);

// PUT /api/admin/vehicles/:id - only whitelisted fields can be changed
router.put('/vehicles/:id', rejectInvalidId, async (req, res, next) => {
  const allowed = ['type', 'name', 'status', 'registrationExpiryDate'];
  const updates = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));

  try {
    const vehicle = await Vehicle.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found.' });
    }
    return res.json(vehicle);
  } catch (error) {
    return next(error);
  }
});

// DELETE /api/admin/vehicles/:id - not allowed while the vehicle is in an active reservation
router.delete('/vehicles/:id', rejectInvalidId, async (req, res, next) => {
  try {
    const active = await Reservation.exists({
      assignedVehicle: req.params.id,
      status: { $in: ['vehicle assigned', 'approved'] },
    });
    if (active) {
      return res.status(400).json({ message: 'A vehicle in an active reservation cannot be deleted.' });
    }

    const vehicle = await Vehicle.findByIdAndDelete(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found.' });
    }
    return res.json({ message: 'Vehicle deleted.' });
  } catch (error) {
    return next(error);
  }
});

/* ===== Reported issues ===== */

// GET /api/admin/issues
router.get('/issues', async (req, res, next) => {
  try {
    const issues = await Issue.find()
      .populate('vehicleId', 'name type')
      .populate('reportedBy', 'name')
      .populate('reservation', 'startDate endDate')
      .sort({ reportedAt: -1 });
    return res.json(issues);
  } catch (error) {
    return next(error);
  }
});

// PUT /api/admin/issues/:id - resolve or reject an issue
router.put(
  '/issues/:id',
  rejectInvalidId,
  body('status').isIn(['resolved', 'rejected']).withMessage('Invalid status.'),
  validate,
  async (req, res, next) => {
    try {
      const issue = await Issue.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
      if (!issue) {
        return res.status(404).json({ message: 'Issue not found.' });
      }
      return res.json({ message: `Issue marked as ${req.body.status}.`, issue });
    } catch (error) {
      return next(error);
    }
  }
);

// DELETE /api/admin/issues/:id
router.delete('/issues/:id', rejectInvalidId, async (req, res, next) => {
  try {
    const issue = await Issue.findByIdAndDelete(req.params.id);
    if (!issue) {
      return res.status(404).json({ message: 'Issue not found.' });
    }
    return res.json({ message: 'Issue deleted.' });
  } catch (error) {
    return next(error);
  }
});

/* ===== Notes ===== */

const noteValidation = [
  body('date').isISO8601().withMessage('Invalid date.'),
  body('text').isString().trim().notEmpty().withMessage('Note text is required.'),
];

// GET /api/admin/notes
router.get('/notes', async (req, res, next) => {
  try {
    return res.json(await Note.find().sort({ date: -1 }));
  } catch (error) {
    return next(error);
  }
});

// POST /api/admin/notes - the author is the logged-in admin
router.post('/notes', noteValidation, validate, async (req, res, next) => {
  try {
    const admin = await User.findById(req.user.id).select('name');
    const note = await Note.create({
      author: admin ? admin.name : 'Administrator',
      date: req.body.date,
      text: req.body.text,
    });
    return res.status(201).json(note);
  } catch (error) {
    return next(error);
  }
});

// PUT /api/admin/notes/:id
router.put('/notes/:id', rejectInvalidId, noteValidation, validate, async (req, res, next) => {
  try {
    const note = await Note.findByIdAndUpdate(
      req.params.id,
      { date: req.body.date, text: req.body.text },
      { new: true, runValidators: true }
    );
    if (!note) {
      return res.status(404).json({ message: 'Note not found.' });
    }
    return res.json(note);
  } catch (error) {
    return next(error);
  }
});

// DELETE /api/admin/notes/:id
router.delete('/notes/:id', rejectInvalidId, async (req, res, next) => {
  try {
    await Note.findByIdAndDelete(req.params.id);
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
