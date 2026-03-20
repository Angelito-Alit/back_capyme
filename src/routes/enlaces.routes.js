const express = require('express');
const router  = express.Router();
const enlacesController = require('../controllers/enlaces.controller');
const { verifyToken, checkRole } = require('../middlewares/auth.middleware');

// Rutas especiales ANTES de /:id para evitar conflictos de matching
router.post('/pagos/confirmar-por-referencia', verifyToken, enlacesController.confirmarPorReferencia);

// CRUD
router.get('/',    verifyToken, enlacesController.obtenerEnlaces);
router.get('/:id', verifyToken, enlacesController.obtenerEnlacePorId);
router.post('/',   verifyToken, checkRole('admin', 'colaborador'), enlacesController.crearEnlace);
router.put('/:id', verifyToken, checkRole('admin', 'colaborador'), enlacesController.actualizarEnlace);
router.patch('/:id/toggle-activo', verifyToken, checkRole('admin'), enlacesController.toggleActivoEnlace);

// Acceso a recursos
router.post('/:id/solicitar-acceso', verifyToken, enlacesController.solicitarAcceso);
router.get('/:id/mi-pago',           verifyToken, enlacesController.obtenerMiPago);
router.get('/:id/accesos',           verifyToken, checkRole('admin', 'colaborador'), enlacesController.obtenerAccesos);

module.exports = router;