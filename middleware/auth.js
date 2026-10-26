const jwt = require('jsonwebtoken');

// Verifies the "Authorization: Bearer <token>" header and attaches the
// token payload ({ id, role }) to req.user.
const requireAuth = (req, res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

// Allows the request only for the given role. Use after requireAuth.
const requireRole = (role) => (req, res, next) => {
  if (!req.user || req.user.role !== role) {
    return res.status(403).json({ message: 'You do not have permission to access this resource.' });
  }
  return next();
};

module.exports = { requireAuth, requireRole };
