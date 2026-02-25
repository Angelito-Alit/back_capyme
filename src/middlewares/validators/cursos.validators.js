const MODALIDADES_VALIDAS = ['presencial', 'online', 'hibrido'];

const validateCrearCurso = (req, res, next) => {
  const { titulo, modalidad, costo, cupoMaximo } = req.body;

  if (!titulo || titulo.trim().length < 3)
    return res.status(400).json({ success: false, message: 'El título del curso es requerido (mínimo 3 caracteres)' });

  if (modalidad && !MODALIDADES_VALIDAS.includes(modalidad))
    return res.status(400).json({ success: false, message: `Modalidad inválida. Valores: ${MODALIDADES_VALIDAS.join(', ')}` });

  if (costo !== undefined && (isNaN(parseFloat(costo)) || parseFloat(costo) < 0))
    return res.status(400).json({ success: false, message: 'El costo debe ser un número positivo' });

  if (cupoMaximo !== undefined && (isNaN(parseInt(cupoMaximo)) || parseInt(cupoMaximo) < 1))
    return res.status(400).json({ success: false, message: 'El cupo máximo debe ser al menos 1' });

  next();
};

module.exports = { validateCrearCurso };