const { prisma } = require('../config/database');

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
        inscripciones: {
          select: {
            id: true,
            usuarioId: true,
            pago: { select: { estadoPago: true } },
          },
        },
      },
      orderBy: { fechaCreacion: 'desc' },
    });

    const usuarioId = req.user?.id;
    const esCliente = req.user?.rol === 'cliente';

    const cursosConInscritos = cursos.map(c => {
      const inscritosConfirmados = c.inscripciones.filter(i =>
        !i.pago || i.pago.estadoPago === 'confirmado'
      ).length;

      let miPagoPendiente = false;
      let yaInscrito = false;
      if (esCliente && usuarioId) {
        const miInscripcion = c.inscripciones.find(i => i.usuarioId === usuarioId);
        if (miInscripcion) {
          if (miInscripcion?.pago?.estadoPago === 'pendiente') {
            miPagoPendiente = true;
          } else {
            yaInscrito = true;
          }
        }
      }
      return { ...c, inscritosCount: inscritosConfirmados, inscripciones: undefined, miPagoPendiente, yaInscrito };
    });

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
    const { activo, fechaInicio, fechaFin, ...data } = req.body;
    const curso = await prisma.curso.create({
      data: { ...data, fechaInicio: parseFecha(fechaInicio), fechaFin: parseFecha(fechaFin), creadoPor: req.user.id },
      include: { creador: { select: { id: true, nombre: true, apellido: true } } },
    });
    await registrarHistorial(req.user.id, 'CREATE', curso.id, `Curso creado: "${curso.titulo}"`, req.ip);
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
    const { activo, fechaInicio, fechaFin, ...rest } = req.body;
    const curso = await prisma.curso.update({
      where: { id },
      data: { ...rest, fechaInicio: parseFecha(fechaInicio), fechaFin: parseFecha(fechaFin) },
      include: { creador: { select: { id: true, nombre: true, apellido: true } } },
    });
    await registrarHistorial(req.user.id, 'UPDATE', curso.id, `Curso actualizado: "${curso.titulo}"`, req.ip);
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
    await registrarHistorial(req.user.id, 'TOGGLE_ACTIVO', curso.id, `Curso ${accionTexto}: "${curso.titulo}"`, req.ip);
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
        pago: { select: { estadoPago: true, referencia: true, monto: true, mercadoPagoId: true } },
      },
      orderBy: { fechaInscripcion: 'desc' },
    });
    res.json({ success: true, data: inscritos });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener inscritos', error: error.message });
  }
};

// ─── INSCRIBIR ─────────────────────────────────────────────────────────────────
// Crea la inscripción + registro de pago pendiente.
// Si ya existe un pago pendiente, devuelve la referencia existente para reanudar MP.
const inscribirCurso = async (req, res) => {
  try {
    const cursoId = parseInt(req.params.id);
    const { negocioId } = req.body;

    const curso = await prisma.curso.findUnique({
      where: { id: cursoId },
      include: {
        inscripciones: {
          include: { pago: { select: { estadoPago: true, referencia: true, monto: true } } },
        },
      },
    });
    if (!curso) return res.status(404).json({ success: false, message: 'Curso no encontrado' });
    if (!curso.activo) return res.status(400).json({ success: false, message: 'Este curso no está disponible' });

    const inscritosConfirmados = curso.inscripciones.filter(i =>
      !i.pago || i.pago.estadoPago === 'confirmado'
    ).length;
    if (curso.cupoMaximo && inscritosConfirmados >= curso.cupoMaximo) {
      return res.status(400).json({ success: false, message: 'El curso ha alcanzado el cupo máximo' });
    }

    const costo = curso.costo ? parseFloat(curso.costo) : 0;
    const requierePago = costo > 0;

    // ── Verificar si ya existe inscripción ──────────────────────────────────
    const inscripcionExistente = await prisma.inscripcionCurso.findUnique({
      where: { unique_usuario_curso: { usuarioId: req.user.id, cursoId } },
      include: { pago: true },
    });

    if (inscripcionExistente) {
      // Pago ya confirmado o gratuito → ya inscrito
      if (!inscripcionExistente.pago || inscripcionExistente.pago.estadoPago === 'confirmado') {
        return res.status(400).json({ success: false, message: 'Ya estás inscrito en este curso' });
      }

      // Pago pendiente → devolver referencia existente para reanudar checkout de MP
      if (inscripcionExistente.pago.estadoPago === 'pendiente') {
        return res.json({
          success: true,
          message: 'Reanudando pago pendiente',
          data: {
            id: inscripcionExistente.id,
            curso: { id: curso.id, titulo: curso.titulo, costo: curso.costo },
            usuario: { id: req.user.id, nombre: req.user.nombre, apellido: req.user.apellido, email: req.user.email },
          },
          requierePago: true,
          pagoInfo: {
            referencia: inscripcionExistente.pago.referencia,
            monto:      inscripcionExistente.pago.monto,
            tituloCurso: curso.titulo,
          },
          esReanudacion: true,
        });
      }
    }

    // ── Nueva inscripción ───────────────────────────────────────────────────
    const inscripcion = await prisma.inscripcionCurso.create({
      data: { cursoId, usuarioId: req.user.id, negocioId: negocioId || null, estado: 'inscrito' },
      include: {
        curso: { select: { id: true, titulo: true, costo: true } },
        usuario: { select: { id: true, nombre: true, apellido: true, email: true } },
      },
    });

    let pagoInfo = null;
    if (requierePago) {
      const referencia = generarReferencia();
      await prisma.pagoInscripcion.create({
        data: {
          inscripcionId: inscripcion.id,
          referencia,
          monto: costo,
          tipoPago: 'spei',
          estadoPago: 'pendiente',
        },
      });
      pagoInfo = { referencia, monto: costo, tituloCurso: curso.titulo };
    }

    // Notificar admins
    const admins = await prisma.usuario.findMany({ where: { rol: 'admin', activo: true }, select: { id: true } });
    const nombreCliente = `${inscripcion.usuario.nombre} ${inscripcion.usuario.apellido}`;
    if (admins.length > 0) {
      await prisma.notificacion.createMany({
        data: admins.map(admin => ({
          usuarioId: admin.id,
          tipo:    requierePago ? 'inscripcion_pendiente_pago' : 'nueva_inscripcion',
          titulo:  requierePago ? 'Nueva solicitud de inscripción' : 'Nueva inscripción',
          mensaje: requierePago
            ? `${nombreCliente} inició inscripción al curso "${curso.titulo}" (${new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(costo)}).`
            : `${nombreCliente} se inscribió al curso gratuito "${curso.titulo}".`,
          leida: false,
        })),
      });
    }

    res.status(201).json({
      success: true,
      message: requierePago ? 'Inscripción iniciada. Completa tu pago.' : 'Inscripción realizada exitosamente',
      data: inscripcion,
      requierePago,
      pagoInfo,
      esReanudacion: false,
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
    res.json({
      success: true,
      data: {
        tienePago: true,
        referencia:  inscripcion.pago.referencia,
        monto:       inscripcion.pago.monto,
        estadoPago:  inscripcion.pago.estadoPago,
        tituloCurso: inscripcion.curso.titulo,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener pago', error: error.message });
  }
};

// ─── CONFIRMAR POR REFERENCIA ─────────────────────────────────────────────────
// Llamado desde PagoExitoso.jsx como respaldo, por si el webhook de MP llega tarde.
// Confirma el pago usando la external_reference que MP devuelve en la back_url.
const confirmarPorReferencia = async (req, res) => {
  try {
    const { referencia } = req.body;
    if (!referencia) return res.status(400).json({ success: false, message: 'Referencia requerida' });

    const pago = await prisma.pagoInscripcion.findUnique({
      where: { referencia: String(referencia) },
      include: {
        inscripcion: {
          include: {
            usuario: { select: { id: true, nombre: true, apellido: true } },
            curso:   { select: { id: true, titulo: true } },
          },
        },
      },
    });

    // No encontrado — puede ser recurso u otro tipo
    if (!pago) return res.json({ success: true, message: 'Pago no encontrado', yaConfirmado: false });

    // Ya confirmado → nada que hacer
    if (pago.estadoPago === 'confirmado') return res.json({ success: true, message: 'Ya confirmado', yaConfirmado: true });

    // Confirmar
    await prisma.pagoInscripcion.update({
      where: { id: pago.id },
      data: {
        estadoPago: 'confirmado',
        fechaConfirmacion: new Date(),
      },
    });

    await prisma.notificacion.create({
      data: {
        usuarioId: pago.inscripcion.usuario.id,
        tipo:    'pago_confirmado',
        titulo:  'Pago confirmado',
        mensaje: `Tu pago para el curso "${pago.inscripcion.curso.titulo}" fue confirmado. ¡Bienvenido!`,
        leida:   false,
      },
    });

    await registrarHistorial(
      pago.inscripcion.usuario.id,
      'CONFIRMAR_PAGO_BACKURL',
      pago.inscripcionId,
      `Pago confirmado vía back_url: ref. ${referencia}`,
      req.ip
    );

    res.json({ success: true, message: 'Pago confirmado exitosamente', yaConfirmado: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al confirmar pago por referencia', error: error.message });
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
            curso:   { select: { id: true, titulo: true, costo: true } },
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
            curso:   { select: { id: true, titulo: true } },
          },
        },
      },
    });

    await prisma.notificacion.create({
      data: {
        usuarioId: pagoActualizado.inscripcion.usuario.id,
        tipo:    'pago_confirmado',
        titulo:  'Pago confirmado',
        mensaje: `Tu pago para el curso "${pagoActualizado.inscripcion.curso.titulo}" fue confirmado. ¡Bienvenido!`,
        leida:   false,
      },
    });

    await registrarHistorial(req.user.id, 'CONFIRMAR_PAGO_MANUAL', pago.inscripcionId, `Pago confirmado manualmente: ref. ${pago.referencia}`, req.ip);
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
            curso:   { select: { id: true, titulo: true } },
          },
        },
      },
    });
    if (!pago) return res.status(404).json({ success: false, message: 'Pago no encontrado' });
    if (pago.estadoPago !== 'pendiente') {
      return res.status(400).json({ success: false, message: 'Solo se pueden declinar pagos en estado pendiente' });
    }

    const usuarioId   = pago.inscripcion.usuario.id;
    const tituloCurso = pago.inscripcion.curso.titulo;

    await prisma.pagoInscripcion.delete({ where: { id } });
    await prisma.inscripcionCurso.delete({ where: { id: pago.inscripcionId } });

    await prisma.notificacion.create({
      data: {
        usuarioId,
        tipo:    'inscripcion_declinada',
        titulo:  'Inscripción declinada',
        mensaje: `Tu inscripción al curso "${tituloCurso}" fue declinada.`,
        leida:   false,
      },
    });

    await registrarHistorial(req.user.id, 'DECLINAR_PAGO', pago.inscripcionId, `Inscripción declinada en "${tituloCurso}"`, req.ip);
    res.json({ success: true, message: 'Inscripción declinada' });
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
  confirmarPorReferencia,
  obtenerPagosPendientes,
  confirmarPago,
  declinarPago,
};