// src/routes/contacto.routes.js
const express = require('express');
const router = express.Router();
const contactoController = require('../controllers/contacto.controller');
const { verifyToken, checkRole } = require('../middlewares/auth.middleware');

router.get('/', contactoController.obtenerContacto);
router.put('/', verifyToken, checkRole('admin'), contactoController.actualizarContacto);

module.exports = router;