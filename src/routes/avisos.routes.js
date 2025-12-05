// src/routes/avisos.routes.js
const express = require('express');
const router = express.Router();
const avisosController = require('../controllers/avisos.controller');
const { verifyToken, checkRole } = require('../middlewares/auth.middleware');

router.get('/', verifyToken, avisosController.obtenerAvisos);
router.get('/:id', verifyToken, avisosController.obtenerAvisoPorId);
router.post('/', verifyToken, checkRole('admin', 'colaborador'), avisosController.crearAviso);
router.put('/:id', verifyToken, checkRole('admin', 'colaborador'), avisosController.actualizarAviso);
router.delete('/:id', verifyToken, checkRole('admin'), avisosController.eliminarAviso);

module.exports = router;