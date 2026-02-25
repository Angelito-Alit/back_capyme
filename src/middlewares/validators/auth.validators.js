const validateLogin = (req, res, next) => {
  const { email, password } = req.body;

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ success: false, message: 'Email inválido' });
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ success: false, message: 'Contraseña inválida (mínimo 6 caracteres)' });
  }

  req.body.email = email.toLowerCase().trim();
  next();
};

const validateRegister = (req, res, next) => {
  const { nombre, apellido, email, password } = req.body;

  if (!nombre || nombre.trim().length < 2)
    return res.status(400).json({ success: false, message: 'El nombre debe tener al menos 2 caracteres' });

  if (!apellido || apellido.trim().length < 2)
    return res.status(400).json({ success: false, message: 'El apellido debe tener al menos 2 caracteres' });

  if (!email || !email.includes('@'))
    return res.status(400).json({ success: false, message: 'Email inválido' });

  if (!password || password.length < 6)
    return res.status(400).json({ success: false, message: 'Contraseña mínimo 6 caracteres' });

  req.body.email = email.toLowerCase().trim();
  next();
};

module.exports = { validateLogin, validateRegister };