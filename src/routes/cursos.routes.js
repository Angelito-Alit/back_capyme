const express = require('express');
const router  = express.Router();
const cursosController  = require('../controllers/cursos.controller');
const { verifyToken, checkRole } = require('../middlewares/auth.middleware');
const { validateCrearCurso }     = require('../middlewares/validators/cursos.validators');

router.get('/pagos-pendientes',                  verifyToken, checkRole('admin'), cursosController.obtenerPagosPendientes);
router.post('/pagos/confirmar-por-referencia',   verifyToken,                     cursosController.confirmarPorReferencia);
router.patch('/pagos/:pagoId/confirmar',         verifyToken, checkRole('admin'), cursosController.confirmarPago);
router.patch('/pagos/:pagoId/declinar',          verifyToken, checkRole('admin'), cursosController.declinarPago);

router.get('/',    verifyToken, cursosController.obtenerCursos);
router.get('/:id', verifyToken, cursosController.obtenerCursoPorId);
router.post('/',   verifyToken, checkRole('admin', 'colaborador'), validateCrearCurso, cursosController.crearCurso);
router.put('/:id', verifyToken, checkRole('admin', 'colaborador'), validateCrearCurso, cursosController.actualizarCurso);
router.patch('/:id/toggle-activo', verifyToken, checkRole('admin'), cursosController.toggleActivoCurso);
router.post('/:id/inscribir',      verifyToken,                    cursosController.inscribirCurso);
router.get('/:id/mi-pago',         verifyToken,                    cursosController.obtenerMiPago);
router.get('/:id/inscritos',       verifyToken, checkRole('admin', 'colaborador'), cursosController.obtenerInscritos);

module.exports = router;