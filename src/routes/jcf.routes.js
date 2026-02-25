const express = require('express');
const router = express.Router();
const jcfController = require('../controllers/jcf.controller');
const { verifyToken, checkRole } = require('../middlewares/auth.middleware');

router.get('/', verifyToken, jcfController.obtenerJovenes);
router.get('/:id', verifyToken, jcfController.obtenerJovenPorId);
router.post('/', verifyToken, checkRole('admin', 'colaborador'), jcfController.crearJoven);
router.put('/:id', verifyToken, checkRole('admin', 'colaborador'), jcfController.actualizarJoven);
router.patch('/:id/toggle-activo', verifyToken, checkRole('admin'), jcfController.toggleActivoJoven);
router.patch('/:id/recurso', verifyToken, checkRole('admin', 'colaborador'), jcfController.actualizarRecurso);

module.exports = router;