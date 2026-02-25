const express = require('express');
const router = express.Router();
const negociosController = require('../controllers/negocios.controller');
const { verifyToken, checkRole } = require('../middlewares/auth.middleware');
const { validateCrearNegocio } = require('../middlewares/validators/negocios.validators');

router.get('/mis-negocios', verifyToken, negociosController.obtenerMisNegocios);
router.get('/',    verifyToken, negociosController.obtenerNegocios);
router.post('/',   verifyToken, validateCrearNegocio, negociosController.crearNegocio);
router.get('/:id', verifyToken, negociosController.obtenerNegocioPorId);
router.put('/:id', verifyToken, validateCrearNegocio, negociosController.actualizarNegocio);
router.patch('/:id/toggle-activo', verifyToken, checkRole('admin'), negociosController.toggleActivoNegocio);

module.exports = router;