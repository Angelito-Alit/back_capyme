const validateCrearNegocio = (req, res, next) => {
  const { nombreNegocio, categoriaId } = req.body;

  if (!nombreNegocio || nombreNegocio.trim().length < 2)
    return res.status(400).json({ success: false, message: 'El nombre del negocio es requerido (mínimo 2 caracteres)' });

  if (!categoriaId || isNaN(parseInt(categoriaId)))
    return res.status(400).json({ success: false, message: 'La categoría es requerida y debe ser un número válido' });

  const rfc = req.body.rfc;
  if (rfc && !/^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$/.test(rfc.toUpperCase())) {
    return res.status(400).json({ success: false, message: 'RFC con formato inválido' });
  }

  if (rfc) req.body.rfc = rfc.toUpperCase().trim();
  next();
};

module.exports = { validateCrearNegocio };