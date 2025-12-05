// src/routes/cursos.routes.js
const express = require('express');
const router = express.Router();
const cursosController = require('../controllers/cursos.controller');
const { verifyToken, checkRole } = require('../middlewares/auth.middleware');

router.get('/', verifyToken, cursosController.obtenerCursos);
router.get('/:id', verifyToken, cursosController.obtenerCursoPorId);
router.post('/', verifyToken, checkRole('admin', 'colaborador'), cursosController.crearCurso);
router.put('/:id', verifyToken, checkRole('admin', 'colaborador'), cursosController.actualizarCurso);
router.delete('/:id', verifyToken, checkRole('admin'), cursosController.eliminarCurso);
router.post('/:id/inscribir', verifyToken, cursosController.inscribirCurso);
router.get('/:id/inscritos', verifyToken, checkRole('admin', 'colaborador'), cursosController.obtenerInscritos);

module.exports = router;