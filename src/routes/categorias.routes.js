// src/routes/categorias.routes.js
const express = require('express');
const router = express.Router();
const categoriasController = require('../controllers/categorias.controller');
const { verifyToken, checkRole } = require('../middlewares/auth.middleware');

router.get('/', categoriasController.obtenerCategorias);
router.get('/:id', categoriasController.obtenerCategoriaPorId);
router.post('/', verifyToken, checkRole('admin', 'colaborador'), categoriasController.crearCategoria);
router.put('/:id', verifyToken, checkRole('admin', 'colaborador'), categoriasController.actualizarCategoria);
router.delete('/:id', verifyToken, checkRole('admin'), categoriasController.eliminarCategoria);

module.exports = router;