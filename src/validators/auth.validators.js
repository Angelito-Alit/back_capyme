const { body } = require('express-validator');

const registerValidator = [
  body('nombre')
    .notEmpty()
    .withMessage('El nombre es requerido')
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre debe tener entre 2 y 100 caracteres'),
  
  body('apellido')
    .notEmpty()
    .withMessage('El apellido es requerido')
    .isLength({ min: 2, max: 100 })
    .withMessage('El apellido debe tener entre 2 y 100 caracteres'),
  
  body('email')
    .notEmpty()
    .withMessage('El email es requerido')
    .isEmail()
    .withMessage('Debe ser un email válido')
    .normalizeEmail(),
  
  body('password')
    .notEmpty()
    .withMessage('La contraseña es requerida')
    .isLength({ min: 6 })
    .withMessage('La contraseña debe tener al menos 6 caracteres'),
  
  body('telefono')
    .optional()
    .isLength({ max: 20 })
    .withMessage('El teléfono no puede tener más de 20 caracteres')
];

const loginValidator = [
  body('email')
    .notEmpty()
    .withMessage('El email es requerido')
    .isEmail()
    .withMessage('Debe ser un email válido')
    .normalizeEmail(),
  
  body('password')
    .notEmpty()
    .withMessage('La contraseña es requerida')
];

module.exports = {
  registerValidator,
  loginValidator
};