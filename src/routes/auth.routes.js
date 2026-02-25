const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authLimiter } = require('../middlewares/rateLimit.middleware');
const { validateLogin, validateRegister } = require('../middlewares/validators/auth.validators');

router.post('/register', authLimiter, validateRegister, authController.register);
router.post('/login',    authLimiter, validateLogin,    authController.login);

module.exports = router;