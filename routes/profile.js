const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Reservation = require('../models/Reservation');
const Vehicle = require('../models/Vehicle');

// Profile routes for the logged-in user (both roles). The user is always
// taken from the verified token (req.user), never from the request body.
const router = express.Router();

// GET /api/profile/image
router.get('/image', async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('profileImage');
    if (!user || !user.profileImage) {
      return res.status(404).json({ message: 'No profile image.' });
    }
    return res.json({ image: user.profileImage });
  } catch (error) {
    return next(error);
  }
});

// PUT /api/profile/image
router.put(
  '/image',
  body('image').isString().matches(/^data:image\/(png|jpeg|jpg|webp|gif);base64,/).withMessage('Invalid image.'),
  async (req, res, next) => {
    if (!validationResult(req).isEmpty()) {
      return res.status(400).json({ message: 'Invalid image.' });
    }
    try {
      await User.findByIdAndUpdate(req.user.id, { profileImage: req.body.image });
      return res.json({ message: 'Profile image saved.' });
    } catch (error) {
      return next(error);
    }
  }
);

// PUT /api/profile/password
router.put(
  '/password',
  [
    body('currentPassword').notEmpty().withMessage('Current password is required.'),
    body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters long.'),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    try {
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ message: 'User not found.' });

      const isMatch = await bcrypt.compare(req.body.currentPassword, user.password);
      if (!isMatch) return res.status(400).json({ message: 'Current password is incorrect.' });

      user.password = await bcrypt.hash(req.body.newPassword, 10);
      await user.save();

      return res.json({ message: 'Password changed successfully.' });
    } catch (error) {
      return next(error);
    }
  }
);

// DELETE /api/profile
// Deletes the account and releases vehicles from the user's active reservations.
router.delete('/', async (req, res, next) => {
  try {
    const reservations = await Reservation.find({ employeeId: req.user.id, status: 'vehicle assigned' });
    for (const reservation of reservations) {
      if (reservation.assignedVehicle) {
        await Vehicle.findByIdAndUpdate(reservation.assignedVehicle, { status: 'available' });
      }
    }
    await Reservation.deleteMany({ employeeId: req.user.id });
    await User.findByIdAndDelete(req.user.id);

    return res.json({ message: 'Profile deleted.' });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
