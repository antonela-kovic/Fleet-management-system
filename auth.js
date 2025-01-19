// --- Routes: auth.js ---
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('./User');
const { check, validationResult } = require('express-validator');
const router = express.Router();

// Register
router.post('/register', [
  check('email', 'Neispravan email.').isEmail(),
  check('password', 'Lozinka mora sadržavati barem 6 znakova.').isLength({ min: 6 }),
  check('name', 'Polje ime je obavezno.').notEmpty(),
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: 'Validacija neuspjela.', errors: errors.array() });
  }

  const { name, email, password, role } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Korisnik već postoji.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, email, password: hashedPassword, role });

    await newUser.save();
    res.status(201).json({ message: 'Korisnik je uspješno registriran.' });
  } catch (error) {
    console.error('Greška pri registraciji korisnika:', error);
    next(error);
  }
});

// Login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    console.log('Primljen zahtjev za prijavu:', { email }); 

    const user = await User.findOne({ email });
    if (!user) {
      console.log('Korisnik nije pronađen.'); // Log
      return res.status(404).json({ message: 'Korisnik nije pronađen.' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      console.log('Neispravne vjerodajnice.'); // Log
      return res.status(401).json({ message: 'Neispravne vjerodajnice.' });
    }

    // Generiranje JWT tokena
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });

    console.log('Korisnik je uspješno prijavljen:', { id: user._id, role: user.role }); // Log

    // Vraćanje `userId` uz token i ulogu
    return res.status(200).json({ 
      token, 
      userId: user._id, 
      role: user.role 
    });
  } catch (error) {
    console.error('Greška prilikom prijave:', error);
    next(error);
  }
});




module.exports = router;