const validateCrearInversion = (req, res, next) => {
  const { campanaId, monto } = req.body;

  if (!campanaId || isNaN(parseInt(campanaId)))
    return res.status(400).json({ success: false, message: 'La campaña es requerida' });

  if (!monto || isNaN(parseFloat(monto)) || parseFloat(monto) <= 0)
    return res.status(400).json({ success: false, message: 'El monto debe ser un número positivo' });

  next();
};

module.exports = { validateCrearInversion };