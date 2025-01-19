// --- Backend: Main Application Entry ---
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors'); // Samo 1 smije biti deklarirano !!!!
const jwt = require('jsonwebtoken');
const app = express();

// Load environment varijable
dotenv.config();

// Middleware
app.use(cors({
 origin: 'http://localhost:5173',
 credentials: true,
}));
app.use(express.json());

// Korištenje MONGO_URI iz .env
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('Error connecting to MongoDB:', err));



// Routes import
const authRoutes = require('./auth');
const employeeRoutes = require('./employee');
const adminRoutes = require('./admin');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/employee', employeeRoutes);
app.use('/api/admin', adminRoutes);

// Unified Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ message: err.message || 'Internal Server Error' });
});


// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
