import { Router } from 'express'
import {
  obtenerCampanas,
  crearCampana,
  actualizarCampana,
  toggleActivoCampana,
  obtenerNegociosParaSelect
} from '../controllers/campanasAdmin.controller.js'
import { verificarToken, esAdmin } from '../middlewares/auth.middleware.js'

const router = Router()

router.use(verificarToken, esAdmin)

router.get('/negocios/opciones', obtenerNegociosParaSelect)
router.get('/', obtenerCampanas)
router.post('/', crearCampana)
router.put('/:id', actualizarCampana)
router.patch('/:id/toggle-activo', toggleActivoCampana)

export default router