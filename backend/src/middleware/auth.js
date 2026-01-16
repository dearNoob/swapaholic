const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

const authMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    return res.status(401).json({ message: 'Invalid token' });
  }
};

const roleCheck = (allowedRoles) => {
  return (req, res, next) => {
    const userRole = req.user?.role;

    // 'user' role can access both buyer and seller routes (unified account)
    if (userRole === 'user' && (allowedRoles.includes('buyer') || allowedRoles.includes('seller') || allowedRoles.includes('user'))) {
      return next();
    }

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    next();
  };
};

module.exports = {
  authMiddleware,
  roleCheck
};
