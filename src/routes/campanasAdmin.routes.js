const { Router } = require('express')
const {
  obtenerCampanas,
  crearCampana,
  actualizarCampana,
  toggleActivoCampana,
  obtenerNegociosParaSelect
} = require('../controllers/campanasAdmin.controller')
const { verificarToken, esAdmin } = require('../middlewares/auth.middleware')

const router = Router()

router.use(verificarToken, esAdmin)

router.get('/negocios/opciones', obtenerNegociosParaSelect)
router.get('/', obtenerCampanas)
router.post('/', crearCampana)
router.put('/:id', actualizarCampana)
router.patch('/:id/toggle-activo', toggleActivoCampana)

module.exports = router