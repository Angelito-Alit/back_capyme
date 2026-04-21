const { Router } = require('express')
const {
  obtenerCampanas,
  obtenerCampanasPublicas,
  obtenerCampanaPorId,
  crearCampana,
  actualizarCampana,
  actualizarEstadoCampana,
  toggleActivoCampana,
  obtenerMisCampanas,
  publicarActualizacion,
  obtenerActualizaciones
} = require('../controllers/campanas.controller')
const { verificarToken } = require('../middlewares/auth.middleware')

const router = Router()

router.get('/publicas', obtenerCampanasPublicas)
router.get('/:id/actualizaciones', obtenerActualizaciones)

router.use(verificarToken)

router.get('/mis-campanas', obtenerMisCampanas)
router.get('/', obtenerCampanas)
router.get('/:id', obtenerCampanaPorId)
router.post('/', crearCampana)
router.put('/:id', actualizarCampana)
router.patch('/:id/estado', actualizarEstadoCampana)
router.patch('/:id/toggle-activo', toggleActivoCampana)
router.post('/:id/actualizaciones', publicarActualizacion)

module.exports = router