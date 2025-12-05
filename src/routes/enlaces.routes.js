// src/routes/enlaces.routes.js
const express = require('express');
const router = express.Router();
const enlacesController = require('../controllers/enlaces.controller');
const { verifyToken, checkRole } = require('../middlewares/auth.middleware');

router.get('/', verifyToken, enlacesController.obtenerEnlaces);
router.get('/:id', verifyToken, enlacesController.obtenerEnlacePorId);
router.post('/', verifyToken, checkRole('admin', 'colaborador'), enlacesController.crearEnlace);
router.put('/:id', verifyToken, checkRole('admin', 'colaborador'), enlacesController.actualizarEnlace);
router.delete('/:id', verifyToken, checkRole('admin'), enlacesController.eliminarEnlace);

module.exports = router;