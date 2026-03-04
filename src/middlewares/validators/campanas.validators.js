const ESTADOS_VALIDOS = ['en_revision', 'aprobada', 'rechazada', 'activa', 'pausada', 'completada', 'cancelada'];

const validateCrearCampana = (req, res, next) => {
  const { titulo, metaRecaudacion, negocioId } = req.body;

  if (!titulo || titulo.trim().length < 3)
    return res.status(400).json({ success: false, message: 'El título es requerido (mínimo 3 caracteres)' });

  if (!negocioId || isNaN(parseInt(negocioId)))
    return res.status(400).json({ success: false, message: 'El negocio es requerido' });

  if (!metaRecaudacion || isNaN(parseFloat(metaRecaudacion)) || parseFloat(metaRecaudacion) <= 0)
    return res.status(400).json({ success: false, message: 'La meta de recaudación debe ser un número positivo' });

  next();
};

const validateActualizarEstado = (req, res, next) => {
  const { estado } = req.body;

  if (!estado)
    return res.status(400).json({ success: false, message: 'El estado es requerido' });

  if (!ESTADOS_VALIDOS.includes(estado))
    return res.status(400).json({ success: false, message: `Estado inválido. Valores: ${ESTADOS_VALIDOS.join(', ')}` });

  next();
};

module.exports = { validateCrearCampana, validateActualizarEstado };