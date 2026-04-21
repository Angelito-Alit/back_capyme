const { Router } = require('express')
const {
  obtenerCampanas,
  crearCampana,
  actualizarCampana,
  toggleActivoCampana,
  obtenerNegociosParaSelect
} = require('../controllers/campanasAdmin.controller')
const { verificarToken } = require('../middlewares/auth.middleware')

const router = Router()

const verificarAdmin = (req, res, next) => {
  if (req.user && req.user.rol === 'admin') {
    next()
  } else {
    res.status(403).json({ success: false, message: 'Acceso denegado' })
  }
}

router.use(verificarToken, verificarAdmin)

router.get('/negocios/opciones', obtenerNegociosParaSelect)
router.get('/', obtenerCampanas)
router.post('/', crearCampana)
router.put('/:id', actualizarCampana)
router.patch('/:id/toggle-activo', toggleActivoCampana)

module.exports = router