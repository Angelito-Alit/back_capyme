// src/routes/usuarios.routes.js
const express = require('express');
const router = express.Router();
const usuariosController = require('../controllers/usuarios.controller');
const { verifyToken, checkRole } = require('../middlewares/auth.middleware');

router.get('/', verifyToken, checkRole('admin', 'colaborador'), usuariosController.obtenerUsuarios);
router.get('/perfil', verifyToken, usuariosController.obtenerPerfil);
router.get('/:id', verifyToken, checkRole('admin', 'colaborador'), usuariosController.obtenerUsuarioPorId);
router.put('/perfil', verifyToken, usuariosController.actualizarPerfil);
router.put('/:id', verifyToken, checkRole('admin'), usuariosController.actualizarUsuario);
router.delete('/:id', verifyToken, checkRole('admin'), usuariosController.eliminarUsuario);

module.exports = router;