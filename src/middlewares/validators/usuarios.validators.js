const ROLES_VALIDOS = ['admin', 'colaborador', 'cliente'];

const validateCrearUsuario = (req, res, next) => {
  const { nombre, apellido, email, password, rol } = req.body;

  if (!nombre || nombre.trim().length < 2)
    return res.status(400).json({ success: false, message: 'Nombre inválido (mínimo 2 caracteres)' });

  if (!apellido || apellido.trim().length < 2)
    return res.status(400).json({ success: false, message: 'Apellido inválido (mínimo 2 caracteres)' });

  if (!email || !email.includes('@'))
    return res.status(400).json({ success: false, message: 'Email inválido' });

  if (!password || password.length < 6)
    return res.status(400).json({ success: false, message: 'Contraseña mínimo 6 caracteres' });

  if (rol && !ROLES_VALIDOS.includes(rol))
    return res.status(400).json({ success: false, message: `Rol inválido. Valores permitidos: ${ROLES_VALIDOS.join(', ')}` });

  req.body.email = email.toLowerCase().trim();
  next();
};

const validateActualizarUsuario = (req, res, next) => {
  const { email, rol, password } = req.body;

  if (email && !email.includes('@'))
    return res.status(400).json({ success: false, message: 'Email inválido' });

  if (rol && !ROLES_VALIDOS.includes(rol))
    return res.status(400).json({ success: false, message: `Rol inválido. Valores permitidos: ${ROLES_VALIDOS.join(', ')}` });

  if (password && password.length < 6)
    return res.status(400).json({ success: false, message: 'Contraseña mínimo 6 caracteres' });

  if (email) req.body.email = email.toLowerCase().trim();
  next();
};

module.exports = { validateCrearUsuario, validateActualizarUsuario };