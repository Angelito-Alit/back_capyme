const express = require('express');
const router = express.Router();
const preguntasController = require('../controllers/preguntas.controller');
const { verifyToken, checkRole } = require('../middlewares/auth.middleware');

router.get('/', verifyToken, checkRole('admin', 'colaborador'), preguntasController.obtenerPreguntas);
router.get('/:id', verifyToken, checkRole('admin', 'colaborador'), preguntasController.obtenerPreguntaPorId);
router.post('/', verifyToken, checkRole('admin', 'colaborador'), preguntasController.crearPregunta);
router.put('/:id', verifyToken, checkRole('admin', 'colaborador'), preguntasController.actualizarPregunta);
router.delete('/:id', verifyToken, checkRole('admin'), preguntasController.eliminarPregunta);

module.exports = router;