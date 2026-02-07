const { verifyJwt } = require('../utils/jwt');

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Brak tokena autoryzacyjnego' });
  }
  const token = authHeader.split(' ')[1];
  const user = verifyJwt(token);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Nieprawidłowy token' });
  }
  req.user = user;
  next();
}

function requireRole(role) {
  return function (req, res, next) {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ success: false, error: 'Brak uprawnień' });
    }
    next();
  };
}

module.exports = { authMiddleware, requireRole };
