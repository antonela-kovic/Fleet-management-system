const path = require('path');
const express = require('express');
const cors = require('cors');

const { requireAuth, requireRole } = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const employeeRoutes = require('./routes/employee');
const adminRoutes = require('./routes/admin');

// Express application without the database connection and the HTTP listener,
// so it can be imported by the tests.
const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '5mb' })); // profile images are sent as base64

app.use('/api/auth', authRoutes);
app.use('/api/profile', requireAuth, profileRoutes);
app.use('/api/employee', requireAuth, requireRole('employee'), employeeRoutes);
app.use('/api/admin', requireAuth, requireRole('admin'), adminRoutes);

// In production the backend also serves the built frontend
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, 'fleet-management-frontend', 'dist');
  app.use(express.static(distPath));
  app.get(/^(?!\/api).*/, (req, res) => res.sendFile(path.join(distPath, 'index.html')));
}

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: 'Internal server error.' });
});

module.exports = app;
