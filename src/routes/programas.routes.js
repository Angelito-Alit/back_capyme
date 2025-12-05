// src/routes/programas.routes.js
const express = require('express');
const router = express.Router();
const programasController = require('../controllers/programas.controller');
const { verifyToken, checkRole } = require('../middlewares/auth.middleware');

router.get('/', verifyToken, programasController.obtenerProgramas);
router.get('/:id', verifyToken, programasController.obtenerProgramaPorId);
router.get('/:id/preguntas', verifyToken, programasController.obtenerPreguntasPrograma);
router.post('/', verifyToken, checkRole('admin', 'colaborador'), programasController.crearPrograma);
router.put('/:id', verifyToken, checkRole('admin', 'colaborador'), programasController.actualizarPrograma);
router.delete('/:id', verifyToken, checkRole('admin'), programasController.eliminarPrograma);
router.post('/:id/preguntas', verifyToken, checkRole('admin', 'colaborador'), programasController.asignarPregunta);
router.delete('/:programaId/preguntas/:preguntaId', verifyToken, checkRole('admin', 'colaborador'), programasController.desasignarPregunta);

module.exports = router;