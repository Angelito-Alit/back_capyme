/**
 * errorHandler.js
 * Middleware global de errores — va AL FINAL de src/index.js
 *
 * Integración en index.js:
 *   const { errorHandler } = require('./middlewares/errorHandler');
 *   // ...todas las rutas...
 *   app.use(errorHandler);   // ← última línea antes de module.exports
 */

const IS_PROD = process.env.NODE_ENV === 'production';

const PRISMA_MESSAGES = {
  P2002: 'Ya existe un registro con esos datos únicos.',
  P2003: 'Referencia a un registro que no existe.',
  P2025: 'Registro no encontrado.',
  P2014: 'La relación requerida no existe.',
  P2016: 'Error en la consulta: registro no encontrado.',
};

const errorHandler = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} →`, err.message);
  if (!IS_PROD) console.error(err.stack);

  // 1. Errores de Prisma
  if (err.code && err.code.startsWith('P')) {
    const msg = PRISMA_MESSAGES[err.code] || 'Error en la base de datos.';
    return res.status(409).json({
      success: false,
      message: msg,
      error: IS_PROD ? err.code : `${err.code}: ${err.message}`,
    });
  }

  // 2. Errores de JWT
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Token expirado.', error: 'TokenExpiredError' });
  }
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Token inválido.', error: 'JsonWebTokenError' });
  }

  // 3. Errores de negocio lanzados con statusCode (throw con e.statusCode = 4xx)
  if (err.statusCode >= 400 && err.statusCode < 500) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      error: IS_PROD ? null : err.stack,
    });
  }

  // 4. Error genérico 500
  return res.status(500).json({
    success: false,
    message: 'Error interno del servidor.',
    error: IS_PROD ? null : err.stack || err.message,
  });
};

module.exports = { errorHandler };