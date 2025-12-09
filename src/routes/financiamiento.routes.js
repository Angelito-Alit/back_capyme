const express = require('express');
const router = express.Router();
const financiamientoController = require('../controllers/financiamiento.controller');
const { verifyToken, checkRole } = require('../middlewares/auth.middleware');

router.get('/', verifyToken, financiamientoController.obtenerFormularios);
router.get('/:id', verifyToken, financiamientoController.obtenerFormularioPorId);
router.post('/', verifyToken, financiamientoController.crearFormulario);
router.put('/:id', verifyToken, financiamientoController.actualizarFormulario);
router.put('/:id/estado', verifyToken, checkRole('admin', 'colaborador'), financiamientoController.actualizarEstado);
router.delete('/:id', verifyToken, checkRole('admin'), financiamientoController.eliminarFormulario);

module.exports = router;