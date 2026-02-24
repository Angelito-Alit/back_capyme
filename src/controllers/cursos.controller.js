const { prisma } = require('../config/database');
const { registrar } = require('../utils/historial');
const parseFecha = (fechaStr) => {
  if (!fechaStr) return null;
  return new Date(`${fechaStr}T12:00:00.000Z`);
};

const registrarHistorial = async (usuarioId, accion, registroId, descripcion, ipAddress) => {
  try {
    await prisma.historialAccion.create({
      data: { usuarioId, accion, tablaAfectada: 'cursos', registroId, descripcion, ipAddress: ipAddress || null },
    });
  } catch {}
};

const generarReferencia = () => {
  const timestamp = Date.now().toString().slice(-10);
  const random = Math.floor(Math.random() * 99999999).toString().padStart(8, '0');
  return `REF${timestamp}${random}`.slice(0, 18);
};

const obtenerCursos = async (req, res) => {
  try {
    const { activo, modalidad } = req.query;
    const where = {};
    if (activo !== undefined) where.activo = activo === 'true';
    if (modalidad) where.modalidad = modalidad;
    const cursos = await prisma.curso.findMany({
      where,
      include: {
        creador: { select: { id: true, nombre: true, apellido: true } },
        inscripciones: { select: { id: true } },
      },
      orderBy: { fechaCreacion: 'desc' },
    });
    const cursosConInscritos = cursos.map(c => ({
      ...c,
      inscritosCount: c.inscripciones.length,
      inscripciones: undefined,
    }));
    res.json({ success: true, data: cursosConInscritos });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener cursos', error: error.message });
  }
};

const obtenerCursoPorId = async (req, res) => {
  try {
    const curso = await prisma.curso.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        creador: { select: { id: true, nombre: true, apellido: true } },
        inscripciones: {
          select: { id: true, estado: true, usuario: { select: { id: true, nombre: true, apellido: true } } },
        },
      },
    });
    if (!curso) return res.status(404).json({ success: false, message: 'Curso no encontrado' });
    res.json({ success: true, data: curso });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener curso', error: error.message });
  }
};

const crearCurso = async (req, res) => {
  try {
    const { activo, fechaInicio, fechaFin, linkInscripcion, linkMaterial, ...data } = req.body;
    const costoNum = data.costo ? parseFloat(data.costo) : 0;
    if (costoNum > 0) {
      const creador = await prisma.usuario.findUnique({
        where: { id: req.user.id },
        select: { clabeInterbancaria: true },
      });
      if (!creador?.clabeInterbancaria) {
        return res.status(400).json({
          success: false,
          message: 'Debes configurar tu CLABE interbancaria en tu perfil antes de crear un curso con costo.',
        });
      }
    }
    const curso = await prisma.curso.create({
      data: { ...data, fechaInicio: parseFecha(fechaInicio), fechaFin: parseFecha(fechaFin), creadoPor: req.user.id },
      include: { creador: { select: { id: true, nombre: true, apellido: true } } },
    });
    await registrarHistorial(req.user.id, 'CREATE', curso.id, `Curso creado: "${curso.titulo}" por ${req.user.nombre} ${req.user.apellido}`, req.ip);
    res.status(201).json({ success: true, message: 'Curso creado exitosamente', data: curso });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al crear curso', error: error.message });
  }
};

const actualizarCurso = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existente = await prisma.curso.findUnique({ where: { id } });
    if (!existente) return res.status(404).json({ success: false, message: 'Curso no encontrado' });
    const { activo, fechaInicio, fechaFin, linkInscripcion, linkMaterial, ...rest } = req.body;
    const costoNuevo = rest.costo ? parseFloat(rest.costo) : 0;
    if (costoNuevo > 0) {
      const creadorActual = await prisma.usuario.findUnique({
        where: { id: req.user.id },
        select: { clabeInterbancaria: true },
      });
      if (!creadorActual?.clabeInterbancaria) {
        return res.status(400).json({
          success: false,
          message: 'Debes configurar tu CLABE interbancaria en tu perfil antes de asignar un costo al curso.',
        });
      }
    }
    const curso = await prisma.curso.update({
      where: { id },
      data: { ...rest, fechaInicio: parseFecha(fechaInicio), fechaFin: parseFecha(fechaFin) },
      include: { creador: { select: { id: true, nombre: true, apellido: true } } },
    });
    await registrarHistorial(req.user.id, 'UPDATE', curso.id, `Curso actualizado: "${curso.titulo}" por ${req.user.nombre} ${req.user.apellido}`, req.ip);
    res.json({ success: true, message: 'Curso actualizado exitosamente', data: curso });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al actualizar curso', error: error.message });
  }
};

const toggleActivoCurso = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existente = await prisma.curso.findUnique({ where: { id } });
    if (!existente) return res.status(404).json({ success: false, message: 'Curso no encontrado' });
    const curso = await prisma.curso.update({
      where: { id },
      data: { activo: !existente.activo },
      include: { creador: { select: { id: true, nombre: true, apellido: true } } },
    });
    const accionTexto = curso.activo ? 'activado' : 'desactivado';
    await registrarHistorial(req.user.id, 'TOGGLE_ACTIVO', curso.id, `Curso ${accionTexto}: "${curso.titulo}" por ${req.user.nombre} ${req.user.apellido}`, req.ip);
    res.json({ success: true, message: `Curso ${accionTexto} exitosamente`, data: curso });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al cambiar estado', error: error.message });
  }
};

const obtenerInscritos = async (req, res) => {
  try {
    const inscritos = await prisma.inscripcionCurso.findMany({
      where: { cursoId: parseInt(req.params.id) },
      include: {
        usuario: { select: { id: true, nombre: true, apellido: true, email: true, telefono: true } },
        negocio: { select: { id: true, nombreNegocio: true } },
      },
      orderBy: { fechaInscripcion: 'desc' },
    });
    res.json({ success: true, data: inscritos });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener inscritos', error: error.message });
  }
};

const inscribirCurso = async (req, res) => {
  try {
    const cursoId = parseInt(req.params.id);
    const { negocioId } = req.body;
    const curso = await prisma.curso.findUnique({
      where: { id: cursoId },
      include: { inscripciones: true },
    });
    if (!curso) return res.status(404).json({ success: false, message: 'Curso no encontrado' });
    if (!curso.activo) return res.status(400).json({ success: false, message: 'Este curso no está disponible' });
    if (curso.cupoMaximo && curso.inscripciones.length >= curso.cupoMaximo) {
      return res.status(400).json({ success: false, message: 'El curso ha alcanzado el cupo máximo' });
    }
    const inscripcionExistente = await prisma.inscripcionCurso.findUnique({
      where: { unique_usuario_curso: { usuarioId: req.user.id, cursoId } },
    });
    if (inscripcionExistente) {
      if (inscripcionExistente.estado === 'inscrito') {
        return res.status(400).json({ success: false, message: 'Ya estás inscrito en este curso' });
      }
      const pago = await prisma.pagoInscripcion.findUnique({
        where: { inscripcionId: inscripcionExistente.id },
      });
      if (pago && pago.estadoPago === 'pendiente') {
        const admin = await prisma.usuario.findFirst({
          where: { rol: 'admin', activo: true },
          select: { clabeInterbancaria: true, whatsappPagos: true },
          orderBy: { id: 'asc' },
        });
        return res.status(400).json({
          success: false,
          message: 'Ya tienes un pago pendiente para este curso',
          pagoExistente: {
            referencia: pago.referencia,
            monto: pago.monto,
            clabeInterbancaria: admin?.clabeInterbancaria || null,
            whatsappPagos: admin?.whatsappPagos || null,
          },
        });
      }
    }
    const costo = curso.costo ? parseFloat(curso.costo) : 0;
    const requierePago = costo > 0;
    const inscripcion = await prisma.inscripcionCurso.create({
      data: {
        cursoId,
        usuarioId: req.user.id,
        negocioId: negocioId || null,
        estado: 'inscrito',
      },
      include: {
        curso: { select: { id: true, titulo: true, costo: true } },
        usuario: { select: { id: true, nombre: true, apellido: true, email: true } },
      },
    });
    let pagoInfo = null;
    if (requierePago) {
      const referencia = generarReferencia();
      const admin = await prisma.usuario.findFirst({
        where: { rol: 'admin', activo: true },
        select: { clabeInterbancaria: true, whatsappPagos: true },
        orderBy: { id: 'asc' },
      });
      await prisma.pagoInscripcion.create({
        data: {
          inscripcionId: inscripcion.id,
          referencia,
          monto: costo,
          tipoPago: 'spei',
          estadoPago: 'pendiente',
        },
      });
      pagoInfo = {
        referencia,
        monto: costo,
        clabeInterbancaria: admin?.clabeInterbancaria || null,
        whatsappPagos: admin?.whatsappPagos || null,
        tituloCurso: curso.titulo,
      };
    }
    res.status(201).json({
      success: true,
      message: requierePago ? 'Solicitud registrada. Realiza tu pago para confirmar tu lugar.' : 'Inscripción realizada exitosamente',
      data: inscripcion,
      requierePago,
      pagoInfo,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al inscribir en curso', error: error.message });
  }
};

const obtenerMiPago = async (req, res) => {
  try {
    const cursoId = parseInt(req.params.id);
    const inscripcion = await prisma.inscripcionCurso.findUnique({
      where: { unique_usuario_curso: { usuarioId: req.user.id, cursoId } },
      include: {
        pago: true,
        curso: { select: { id: true, titulo: true, costo: true } },
      },
    });
    if (!inscripcion) return res.status(404).json({ success: false, message: 'No tienes inscripción para este curso' });
    if (!inscripcion.pago) return res.json({ success: true, data: { tienePago: false } });
    const admin = await prisma.usuario.findFirst({
      where: { rol: 'admin', activo: true },
      select: { clabeInterbancaria: true, whatsappPagos: true },
      orderBy: { id: 'asc' },
    });
    res.json({
      success: true,
      data: {
        tienePago: true,
        referencia: inscripcion.pago.referencia,
        monto: inscripcion.pago.monto,
        estadoPago: inscripcion.pago.estadoPago,
        tituloCurso: inscripcion.curso.titulo,
        clabeInterbancaria: admin?.clabeInterbancaria || null,
        whatsappPagos: admin?.whatsappPagos || null,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener pago', error: error.message });
  }
};

const obtenerPagosPendientes = async (req, res) => {
  try {
    const pagos = await prisma.pagoInscripcion.findMany({
      where: { estadoPago: 'pendiente' },
      include: {
        inscripcion: {
          include: {
            usuario: { select: { id: true, nombre: true, apellido: true, email: true, telefono: true } },
            curso: { select: { id: true, titulo: true, costo: true } },
            negocio: { select: { id: true, nombreNegocio: true } },
          },
        },
      },
      orderBy: { fechaCreacion: 'desc' },
    });
    res.json({ success: true, data: pagos });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener pagos pendientes', error: error.message });
  }
};

const confirmarPago = async (req, res) => {
  try {
    const id = parseInt(req.params.pagoId);
    const pago = await prisma.pagoInscripcion.findUnique({ where: { id } });
    if (!pago) return res.status(404).json({ success: false, message: 'Pago no encontrado' });
    if (pago.estadoPago === 'confirmado') return res.status(400).json({ success: false, message: 'Este pago ya fue confirmado' });
    const pagoActualizado = await prisma.pagoInscripcion.update({
      where: { id },
      data: { estadoPago: 'confirmado', confirmadoPor: req.user.id, fechaConfirmacion: new Date() },
      include: {
        inscripcion: {
          include: {
            usuario: { select: { id: true, nombre: true, apellido: true, email: true } },
            curso: { select: { id: true, titulo: true } },
          },
        },
      },
    });
    await registrarHistorial(req.user.id, 'CONFIRMAR_PAGO', pago.inscripcionId, `Pago confirmado: ref. ${pago.referencia} por ${req.user.nombre} ${req.user.apellido}`, req.ip);
    res.json({ success: true, message: 'Pago confirmado exitosamente', data: pagoActualizado });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al confirmar pago', error: error.message });
  }
};

const declinarPago = async (req, res) => {
  try {
    const id = parseInt(req.params.pagoId);

    const pago = await prisma.pagoInscripcion.findUnique({
      where: { id },
      include: {
        inscripcion: {
          include: {
            usuario: { select: { id: true, nombre: true, apellido: true, email: true } },
            curso: { select: { id: true, titulo: true } },
          },
        },
      },
    });

    if (!pago) return res.status(404).json({ success: false, message: 'Pago no encontrado' });
    if (pago.estadoPago !== 'pendiente') {
      return res.status(400).json({ success: false, message: 'Solo se pueden declinar pagos en estado pendiente' });
    }

    await prisma.pagoInscripcion.update({
      where: { id },
      data: { estadoPago: 'declinado' },
    });

    await prisma.inscripcionCurso.update({
      where: { id: pago.inscripcionId },
      data: { estado: 'abandonado' },
    });

    await prisma.notificacion.create({
      data: {
        usuarioId: pago.inscripcion.usuarioId,
        tipo: 'inscripcion_declinada',
        titulo: 'Inscripción declinada',
        mensaje: `Tu solicitud de inscripción al curso "${pago.inscripcion.curso.titulo}" fue declinada por el equipo CAPYME. Si tienes dudas, contáctanos directamente.`,
        leida: false,
      },
    }).catch(() => {});

    await registrarHistorial(
      req.user.id, 'DECLINAR_PAGO', pago.inscripcionId,
      `Inscripción declinada: ${pago.inscripcion.usuario.nombre} ${pago.inscripcion.usuario.apellido} en "${pago.inscripcion.curso.titulo}" por ${req.user.nombre} ${req.user.apellido}`,
      req.ip
    );

    res.json({ success: true, message: 'Inscripción declinada y cliente notificado' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al declinar inscripción', error: error.message });
  }
};

module.exports = {
  obtenerCursos,
  obtenerCursoPorId,
  crearCurso,
  actualizarCurso,
  toggleActivoCurso,
  obtenerInscritos,
  inscribirCurso,
  obtenerMiPago,
  obtenerPagosPendientes,
  confirmarPago,
  declinarPago,
};