const express = require('express');
const router = express.Router();
const inversionesController = require('../controllers/inversiones.controller');
const { verifyToken, checkRole } = require('../middlewares/auth.middleware');
const { validateCrearInversion } = require('../middlewares/validators/inversiones.validators');

router.post('/confirmar-por-referencia',  verifyToken,                                    inversionesController.confirmarPorReferencia);
router.get('/pendientes',                 verifyToken, checkRole('admin', 'colaborador'),  inversionesController.obtenerPendientes);
router.get('/mias',                       verifyToken,                                    inversionesController.obtenerMisInversiones);
router.get('/campana/:campanaId',         verifyToken,                                    inversionesController.obtenerInversionesPorCampana);
router.get('/',                           verifyToken,                                    inversionesController.obtenerInversiones);
router.get('/:id',                        verifyToken,                                    inversionesController.obtenerInversionPorId);
router.post('/',                          verifyToken, validateCrearInversion,             inversionesController.crearInversion);
router.put('/:id',                        verifyToken,                                    inversionesController.actualizarInversion);
router.patch('/:id/confirmar',            verifyToken, checkRole('admin'),                 inversionesController.confirmarInversion);
router.patch('/:id/rechazar',             verifyToken, checkRole('admin'),                 inversionesController.rechazarInversion);
router.patch('/:id/toggle-activo',        verifyToken, checkRole('admin'),                 inversionesController.toggleActivoInversion);

module.exports = router;