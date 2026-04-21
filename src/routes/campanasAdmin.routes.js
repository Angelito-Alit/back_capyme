import { Router } from 'express'
import {
  obtenerCampanas,
  crearCampana,
  actualizarCampana,
  eliminarCampana,
  obtenerNegociosParaSelect
} from '../controllers/campanasAdmin.controller.js'
import { verificarToken, esAdmin } from '../middlewares/auth.middleware.js'

const router = Router()

router.use(verificarToken, esAdmin)

router.get('/', obtenerCampanas)
router.post('/', crearCampana)
router.put('/:id', actualizarCampana)
router.delete('/:id', eliminarCampana)
router.get('/negocios/opciones', obtenerNegociosParaSelect)

export default router