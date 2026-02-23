const express = require('express');
const router = express.Router();
const enlacesController = require('../controllers/enlaces.controller');
const { verifyToken, checkRole } = require('../middlewares/auth.middleware');

router.get('/', verifyToken, enlacesController.obtenerEnlaces);
router.get('/:id', verifyToken, enlacesController.obtenerEnlacePorId);
router.post('/', verifyToken, checkRole('admin', 'colaborador'), enlacesController.crearEnlace);
router.put('/:id', verifyToken, checkRole('admin', 'colaborador'), enlacesController.actualizarEnlace);
router.patch('/:id/toggle-activo', verifyToken, checkRole('admin'), enlacesController.toggleActivoEnlace);

module.exports = router;