const express = require('express');
const router = express.Router();
const trabajadoresController = require('../controllers/trabajadores.controller');
const { verifyToken, checkRole } = require('../middlewares/auth.middleware');

router.get('/', verifyToken, checkRole('admin', 'colaborador'), trabajadoresController.obtenerTrabajadores);
router.get('/:id', verifyToken, checkRole('admin', 'colaborador'), trabajadoresController.obtenerTrabajadorPorId);
router.post('/', verifyToken, checkRole('admin', 'colaborador'), trabajadoresController.crearTrabajador);
router.put('/:id', verifyToken, checkRole('admin', 'colaborador'), trabajadoresController.actualizarTrabajador);
router.delete('/:id', verifyToken, checkRole('admin'), trabajadoresController.eliminarTrabajador);

module.exports = router;