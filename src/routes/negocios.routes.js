const express = require('express');
const router = express.Router();
const negociosController = require('../controllers/negocios.controller');
const { verifyToken, checkRole } = require('../middlewares/auth.middleware');

router.get('/mis-negocios', verifyToken, negociosController.obtenerMisNegocios);

router.get('/', verifyToken, negociosController.obtenerNegocios);
router.post('/', verifyToken, negociosController.crearNegocio);
router.get('/:id', verifyToken, negociosController.obtenerNegocioPorId);
router.put('/:id', verifyToken, negociosController.actualizarNegocio);
router.delete('/:id', verifyToken, checkRole('admin'), negociosController.eliminarNegocio);

module.exports = router;