const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');

const router = express.Router();

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
  }
  return next();
};

// POST /api/auth/register
// Self-registration always creates an employee account. Admin accounts are
// created with `npm run create-admin` (see scripts/createAdmin.js).
router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required.'),
    body('email').trim().toLowerCase().isEmail().withMessage('Invalid email address.'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long.'),
  ],
  handleValidation,
  async (req, res, next) => {
    const { name, email, password } = req.body;

    try {
      if (await User.exists({ email })) {
        return res.status(400).json({ message: 'A user with this email already exists.' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      await User.create({ name, email, password: hashedPassword, role: 'employee' });

      return res.status(201).json({ message: 'Registration successful.' });
    } catch (error) {
      return next(error);
    }
  }
);

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email').trim().toLowerCase().isEmail().withMessage('Invalid email address.'),
    body('password').notEmpty().withMessage('Password is required.'),
  ],
  handleValidation,
  async (req, res, next) => {
    const { email, password } = req.body;

    try {
      const user = await User.findOne({ email });
      // Same response for an unknown email and a wrong password, so the API
      // does not reveal which email addresses are registered.
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ message: 'Invalid email or password.' });
      }

      const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });

      return res.status(200).json({
        token,
        userId: user._id,
        role: user.role,
        name: user.name,
        email: user.email,
      });
    } catch (error) {
      return next(error);
    }
  }
);

module.exports = router;
