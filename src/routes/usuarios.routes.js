const express = require('express');
const router = express.Router();
const usuariosController = require('../controllers/usuarios.controller');
const { verifyToken, checkRole } = require('../middlewares/auth.middleware');
const { validateCrearUsuario, validateActualizarUsuario } = require('../middlewares/validators/usuarios.validators');

router.get('/perfil', verifyToken, usuariosController.obtenerPerfil);
router.put('/perfil', verifyToken, usuariosController.actualizarPerfil);

router.get('/',    verifyToken, checkRole('admin', 'colaborador'), usuariosController.obtenerUsuarios);
router.post('/',   verifyToken, checkRole('admin', 'colaborador'), validateCrearUsuario, usuariosController.crearUsuario);
router.get('/:id', verifyToken, checkRole('admin', 'colaborador'), usuariosController.obtenerUsuarioPorId);
router.put('/:id', verifyToken, checkRole('admin'),                validateActualizarUsuario, usuariosController.actualizarUsuario);
router.patch('/:id/toggle-activo', verifyToken, checkRole('admin'), usuariosController.toggleActivoUsuario);
router.delete('/:id',              verifyToken, checkRole('admin'), usuariosController.eliminarUsuario);

module.exports = router;