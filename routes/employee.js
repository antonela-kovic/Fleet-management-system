const express = require('express');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const Reservation = require('../models/Reservation');
const Issue = require('../models/Issue');

// Employee routes. All of them require a valid token with the "employee" role
// (see server.js); the employee is always req.user.id.
const router = express.Router();

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// Finds a reservation that belongs to the logged-in employee.
const findOwnReservation = (id, employeeId) => Reservation.findOne({ _id: id, employeeId });

// POST /api/employee/reservations
router.post(
  '/reservations',
  [
    body('vehicleType').isString().trim().notEmpty().withMessage('Vehicle type is required.'),
    body('purpose').isString().trim().notEmpty().withMessage('Purpose is required.'),
    body('startDate').isISO8601().withMessage('Invalid start date.'),
    body('endDate').isISO8601().withMessage('Invalid end date.'),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const { vehicleType, startDate, endDate, purpose } = req.body;
    if (new Date(startDate) >= new Date(endDate)) {
      return res.status(400).json({ message: 'The start date must be before the end date.' });
    }

    try {
      const reservation = await Reservation.create({
        employeeId: req.user.id,
        vehicleType,
        startDate,
        endDate,
        purpose,
      });
      return res.status(201).json({ message: 'Reservation created.', reservation });
    } catch (error) {
      return next(error);
    }
  }
);

// GET /api/employee/reservations - the logged-in employee's reservations
router.get('/reservations', async (req, res, next) => {
  try {
    const reservations = await Reservation.find({ employeeId: req.user.id })
      .populate('assignedVehicle', 'name type')
      .sort({ startDate: -1 });
    return res.json(reservations);
  } catch (error) {
    return next(error);
  }
});

// PATCH /api/employee/reservations/:id/cancel
// A reservation can be cancelled only before it starts. The record is kept
// with the status "cancelled by user" so the admin can still see it.
router.patch('/reservations/:id/cancel', async (req, res, next) => {
  if (!isValidId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid reservation ID.' });
  }

  try {
    const reservation = await findOwnReservation(req.params.id, req.user.id);
    if (!reservation) {
      return res.status(404).json({ message: 'Reservation not found.' });
    }
    if (new Date() >= reservation.startDate) {
      return res.status(400).json({ message: 'A reservation cannot be cancelled after it has started.' });
    }

    reservation.status = 'cancelled by user';
    await reservation.save();
    return res.json({ message: 'Reservation cancelled.', reservation });
  } catch (error) {
    return next(error);
  }
});

// POST /api/employee/report-problem
router.post(
  '/report-problem',
  [
    body('reservationId').custom(isValidId).withMessage('Invalid reservation ID.'),
    body('description').isString().trim().notEmpty().withMessage('Description is required.'),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    try {
      const reservation = await findOwnReservation(req.body.reservationId, req.user.id);
      if (!reservation) {
        return res.status(404).json({ message: 'Reservation not found.' });
      }
      if (reservation.status !== 'vehicle assigned' || !reservation.assignedVehicle) {
        return res.status(400).json({ message: 'A problem can be reported only for a reservation with an assigned vehicle.' });
      }

      const issue = await Issue.create({
        vehicleId: reservation.assignedVehicle,
        description: req.body.description,
        reportedBy: req.user.id,
        reservation: reservation._id,
      });
      return res.status(201).json({ message: 'Problem reported.', issue });
    } catch (error) {
      return next(error);
    }
  }
);

module.exports = router;
