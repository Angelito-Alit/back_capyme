const rateLimit = {};

const createLimiter = (max, windowMs) => {
  return (req, res, next) => {
    const key = req.ip + req.path;
    const now = Date.now();

    if (!rateLimit[key]) {
      rateLimit[key] = { count: 1, start: now };
      return next();
    }

    const entry = rateLimit[key];

    if (now - entry.start > windowMs) {
      entry.count = 1;
      entry.start = now;
      return next();
    }

    entry.count++;

    if (entry.count > max) {
      return res.status(429).json({
        success: false,
        message: 'Demasiadas solicitudes. Intenta más tarde.',
      });
    }

    next();
  };
};

const authLimiter    = createLimiter(10, 15 * 60 * 1000);
const generalLimiter = createLimiter(200, 60 * 1000);

module.exports = { authLimiter, generalLimiter };