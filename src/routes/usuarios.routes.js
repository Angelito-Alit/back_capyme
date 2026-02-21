const express = require('express');
const router = express.Router();
const usuariosController = require('../controllers/usuarios.controller');
const { verifyToken, checkRole } = require('../middlewares/auth.middleware');

router.get('/perfil', verifyToken, usuariosController.obtenerPerfil);
router.put('/perfil', verifyToken, usuariosController.actualizarPerfil);

router.get('/', verifyToken, checkRole('admin', 'colaborador'), usuariosController.obtenerUsuarios);
router.post('/', verifyToken, checkRole('admin'), usuariosController.crearUsuario);
router.get('/:id', verifyToken, checkRole('admin', 'colaborador'), usuariosController.obtenerUsuarioPorId);
router.put('/:id', verifyToken, checkRole('admin'), usuariosController.actualizarUsuario);
router.delete('/:id', verifyToken, checkRole('admin'), usuariosController.eliminarUsuario);

module.exports = router;