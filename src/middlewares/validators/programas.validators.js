const ESTADOS_VALIDOS = ['Abierto', 'Cerrado', 'Suspendido', 'Próximamente'];

const validateCrearPrograma = (req, res, next) => {
  const { nombre, estado, montoApoyo } = req.body;

  if (!nombre || nombre.trim().length < 3)
    return res.status(400).json({ success: false, message: 'El nombre del programa es requerido (mínimo 3 caracteres)' });

  if (estado && !ESTADOS_VALIDOS.includes(estado))
    return res.status(400).json({ success: false, message: `Estado inválido. Valores: ${ESTADOS_VALIDOS.join(', ')}` });

  if (montoApoyo !== undefined && (isNaN(parseFloat(montoApoyo)) || parseFloat(montoApoyo) < 0))
    return res.status(400).json({ success: false, message: 'El monto de apoyo debe ser un número positivo' });

  next();
};

module.exports = { validateCrearPrograma };