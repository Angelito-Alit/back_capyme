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

    const cursosConInscritos = cursos.map((c) => ({
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

    const curso = await prisma.curso.findUnique({ where: { id: cursoId }, include: { inscripciones: true } });
    if (!curso) return res.status(404).json({ success: false, message: 'Curso no encontrado' });
    if (!curso.activo) return res.status(400).json({ success: false, message: 'Este curso no está disponible' });
    if (curso.cupoMaximo && curso.inscripciones.length >= curso.cupoMaximo) {
      return res.status(400).json({ success: false, message: 'El curso ha alcanzado el cupo máximo' });
    }

    const inscripcionExistente = await prisma.inscripcionCurso.findUnique({
      where: { usuarioId_cursoId: { usuarioId: req.user.id, cursoId } },
    });
    if (inscripcionExistente) return res.status(400).json({ success: false, message: 'Ya estás inscrito en este curso' });

    const inscripcion = await prisma.inscripcionCurso.create({
      data: { cursoId, usuarioId: req.user.id, negocioId: negocioId || null },
      include: {
        curso: true,
        usuario: { select: { id: true, nombre: true, apellido: true, email: true } },
      },
    });

    res.status(201).json({ success: true, message: 'Inscripción realizada exitosamente', data: inscripcion });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al inscribir en curso', error: error.message });
  }
};

// ── PAGOS PENDIENTES ──────────────────────────────────────────────────────────
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

module.exports = {
  obtenerCursos,
  obtenerCursoPorId,
  crearCurso,
  actualizarCurso,
  toggleActivoCurso,
  obtenerInscritos,
  inscribirCurso,
  obtenerPagosPendientes,
  confirmarPago,
};