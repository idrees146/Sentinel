const ApiError = require('../utils/ApiError');

const requireRole = (allowedRoles) => (req, _res, next) => {
  if (!req.user) {
    return next(new ApiError(401, 'UNAUTHORIZED', 'Authentication required'));
  }
  if (!allowedRoles.includes(req.user.role)) {
    return next(
      new ApiError(403, 'FORBIDDEN', `Role '${req.user.role}' is not permitted to perform this action`)
    );
  }
  next();
};

module.exports = requireRole;
