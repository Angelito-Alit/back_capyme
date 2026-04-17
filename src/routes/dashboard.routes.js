const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const { verifyToken, checkRole } = require('../middlewares/auth.middleware');

router.get('/estadisticas',          verifyToken, checkRole('admin', 'colaborador'), dashboardController.obtenerEstadisticasGenerales);
router.get('/negocios-categoria',    verifyToken, checkRole('admin', 'colaborador'), dashboardController.obtenerNegociosPorCategoria);
router.get('/postulaciones-estado',  verifyToken, checkRole('admin', 'colaborador'), dashboardController.obtenerPostulacionesPorEstado);
router.get('/postulaciones-programa',verifyToken, checkRole('admin', 'colaborador'), dashboardController.obtenerPostulacionesPorPrograma);
router.get('/ultimos-negocios',      verifyToken, checkRole('admin', 'colaborador'), dashboardController.obtenerUltimosNegocios);
router.get('/ultimas-postulaciones', verifyToken, checkRole('admin', 'colaborador'), dashboardController.obtenerUltimasPostulaciones);
router.get('/cliente/estadisticas',  verifyToken, checkRole('cliente'),              dashboardController.obtenerEstadisticasCliente);
router.get('/cursos-inscritos',      verifyToken, checkRole('admin', 'colaborador'), dashboardController.obtenerCursosMasInscritos);

router.get('/postulaciones-mes',     verifyToken, checkRole('admin', 'colaborador'), dashboardController.obtenerPostulacionesPorMes);
router.get('/negocios-estado',       verifyToken, checkRole('admin', 'colaborador'), dashboardController.obtenerNegociosPorEstado);
router.get('/inscripciones-cursos',  verifyToken, checkRole('admin', 'colaborador'), dashboardController.obtenerInscripcionesPorCurso);
router.get('/usuarios-rol',          verifyToken, checkRole('admin', 'colaborador'), dashboardController.obtenerUsuariosPorRol);

module.exports = router;