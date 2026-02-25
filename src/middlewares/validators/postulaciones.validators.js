const ESTADOS_VALIDOS = ['pendiente', 'en_revision', 'aprobada', 'rechazada', 'completada'];

const validateCrearPostulacion = (req, res, next) => {
  const { negocioId, programaId } = req.body;

  if (!negocioId || isNaN(parseInt(negocioId)))
    return res.status(400).json({ success: false, message: 'negocioId es requerido y debe ser un número válido' });

  if (!programaId || isNaN(parseInt(programaId)))
    return res.status(400).json({ success: false, message: 'programaId es requerido y debe ser un número válido' });

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

module.exports = { validateCrearPostulacion, validateActualizarEstado };