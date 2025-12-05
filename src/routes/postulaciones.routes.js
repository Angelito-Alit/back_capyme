// src/routes/postulaciones.routes.js
const express = require('express');
const router = express.Router();
const postulacionesController = require('../controllers/postulaciones.controller');
const { verifyToken, checkRole } = require('../middlewares/auth.middleware');

router.get('/', verifyToken, postulacionesController.obtenerPostulaciones);
router.get('/mis-postulaciones', verifyToken, postulacionesController.obtenerMisPostulaciones);
router.get('/:id', verifyToken, postulacionesController.obtenerPostulacionPorId);
router.post('/', verifyToken, postulacionesController.crearPostulacion);
router.put('/:id', verifyToken, postulacionesController.actualizarPostulacion);
router.put('/:id/estado', verifyToken, checkRole('admin', 'colaborador'), postulacionesController.actualizarEstado);
router.delete('/:id', verifyToken, checkRole('admin'), postulacionesController.eliminarPostulacion);

module.exports = router;