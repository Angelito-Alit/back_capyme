const express = require('express');
const router = express.Router();
const postulacionesController = require('../controllers/postulaciones.controller');
const { verifyToken, checkRole } = require('../middlewares/auth.middleware');
const { validateCrearPostulacion, validateActualizarEstado } = require('../middlewares/validators/postulaciones.validators');

router.get('/mis-postulaciones', verifyToken, postulacionesController.obtenerMisPostulaciones);
router.get('/', verifyToken, postulacionesController.obtenerPostulaciones);
router.post('/', verifyToken, validateCrearPostulacion, postulacionesController.crearPostulacion);
router.get('/:id', verifyToken, postulacionesController.obtenerPostulacionPorId);
router.put('/:id', verifyToken, checkRole('admin', 'colaborador'), postulacionesController.actualizarPostulacion);
router.put('/:id/estado', verifyToken, checkRole('admin', 'colaborador'), validateActualizarEstado, postulacionesController.actualizarEstado);
router.patch('/:id/toggle-activo', verifyToken, checkRole('admin'), postulacionesController.toggleActivoPostulacion);
router.delete('/:id', verifyToken, checkRole('admin'), postulacionesController.eliminarPostulacion);

router.get('/:id/notas', verifyToken, checkRole('admin', 'colaborador'), postulacionesController.obtenerNotas);
router.post('/:id/notas', verifyToken, checkRole('admin', 'colaborador'), postulacionesController.crearNota);
router.delete('/:id/notas/:notaId', verifyToken, checkRole('admin', 'colaborador'), postulacionesController.eliminarNota);

module.exports = router;