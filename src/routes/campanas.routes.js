const express = require('express');
const router = express.Router();
const campanasController = require('../controllers/campanas.controller');
const { verifyToken, checkRole } = require('../middlewares/auth.middleware');
const { validateCrearCampana, validateActualizarEstado } = require('../middlewares/validators/campanas.validators');

router.get('/publicas',                         verifyToken,                                  campanasController.obtenerCampanasPublicas);
router.get('/mias',                             verifyToken,                                  campanasController.obtenerMisCampanas);
router.get('/',                                 verifyToken,                                  campanasController.obtenerCampanas);
router.get('/:id',                              verifyToken,                                  campanasController.obtenerCampanaPorId);
router.post('/',                                verifyToken, validateCrearCampana,             campanasController.crearCampana);
router.put('/:id',                              verifyToken,                                  campanasController.actualizarCampana);
router.put('/:id/estado',                       verifyToken, checkRole('admin'),               validateActualizarEstado, campanasController.actualizarEstadoCampana);
router.patch('/:id/toggle-activo',              verifyToken, checkRole('admin'),               campanasController.toggleActivoCampana);
router.post('/:id/actualizaciones',             verifyToken,                                  campanasController.publicarActualizacion);
router.get('/:id/actualizaciones',              verifyToken,                                  campanasController.obtenerActualizaciones);

module.exports = router;