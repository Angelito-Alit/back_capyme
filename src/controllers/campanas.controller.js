const { prisma } = require('../config/database');

const registrarHistorial = async (usuarioId, accion, registroId, descripcion, ip) => {
  try {
    await prisma.historialAccion.create({
      data: { usuarioId, accion, tablaAfectada: 'campanas', registroId, descripcion, ipAddress: ip || null },
    });
  } catch {}
};

const parseFecha = (fechaStr) => {
  if (!fechaStr) return null;
  return new Date(`${fechaStr}T12:00:00.000Z`);
};

const includeBase = {
  negocio: {
    select: {
      id: true,
      nombreNegocio: true,
      rfc: true,
      ciudad: true,
      estado: true,
      usuarioId: true,
      categoria: { select: { id: true, nombre: true } },
      usuario: { select: { id: true, nombre: true, apellido: true, email: true } },
    },
  },
  creador: { select: { id: true, nombre: true, apellido: true } },
};

const obtenerCampanas = async (req, res) => {
  try {
    const { activo, estado, negocioId, buscar } = req.query;

    const where = {};
    if (activo !== undefined) where.activo = activo === 'true';
    if (estado) where.estado = estado;
    if (negocioId) where.negocioId = parseInt(negocioId);
    if (buscar) {
      where.OR = [
        { titulo: { contains: buscar } },
        { descripcion: { contains: buscar } },
      ];
    }

    if (req.user.rol === 'cliente') {
      where.negocio = { usuarioId: req.user.id };
    }

    const campanas = await prisma.campana.findMany({
      where,
      include: includeBase,
      orderBy: { fechaCreacion: 'desc' },
    });

    res.json({ success: true, data: campanas });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener campañas', error: error.message });
  }
};

const obtenerCampanasPublicas = async (req, res) => {
  try {
    const { buscar, estado } = req.query;

    const where = {
      activo: true,
      estado: estado || 'aprobada',
    };
    if (buscar) {
      where.OR = [
        { titulo: { contains: buscar } },
        { descripcion: { contains: buscar } },
      ];
    }

    const campanas = await prisma.campana.findMany({
      where,
      include: includeBase,
      orderBy: { fechaCreacion: 'desc' },
    });

    res.json({ success: true, data: campanas });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener campañas públicas', error: error.message });
  }
};

const obtenerCampanaPorId = async (req, res) => {
  try {
    const campana = await prisma.campana.findUnique({
      where: { id: parseInt(req.params.id) },
      include: includeBase,
    });

    if (!campana) return res.status(404).json({ success: false, message: 'Campaña no encontrada' });

    if (req.user.rol === 'cliente' && campana.negocio.usuarioId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'No tienes permiso para ver esta campaña' });
    }

    res.json({ success: true, data: campana });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener campaña', error: error.message });
  }
};

const crearCampana = async (req, res) => {
  try {
    const { activo, estado, negocioId, fechaInicio, fechaCierre, ...data } = req.body;

    if (!negocioId) {
      return res.status(400).json({ success: false, message: 'El negocio es requerido' });
    }

    const negocio = await prisma.negocio.findUnique({ where: { id: parseInt(negocioId) } });
    if (!negocio) return res.status(404).json({ success: false, message: 'Negocio no encontrado' });

    if (req.user.rol === 'cliente' && negocio.usuarioId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'No puedes crear una campaña para este negocio' });
    }

    const campana = await prisma.campana.create({
      data: {
        ...data,
        negocioId: parseInt(negocioId),
        creadoPor: req.user.id,
        fechaInicio: parseFecha(fechaInicio),
        fechaCierre: parseFecha(fechaCierre),
      },
      include: includeBase,
    });

    await registrarHistorial(req.user.id, 'CREATE', campana.id, `Campaña creada: "${campana.titulo}"`, req.ip);

    res.status(201).json({ success: true, message: 'Campaña creada exitosamente', data: campana });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al crear campaña', error: error.message });
  }
};

const actualizarCampana = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existente = await prisma.campana.findUnique({ where: { id }, include: { negocio: true } });
    if (!existente) return res.status(404).json({ success: false, message: 'Campaña no encontrada' });

    if (req.user.rol === 'cliente' && existente.negocio.usuarioId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'No tienes permiso para editar esta campaña' });
    }

    const { activo, estado, creadoPor, fechaInicio, fechaCierre, metaRecaudacion, negocioId, ...rest } = req.body;

    const dataActualizar = {
      ...rest,
      fechaInicio: parseFecha(fechaInicio),
      fechaCierre: parseFecha(fechaCierre),
    };

    if (req.user.rol !== 'cliente' && negocioId) {
      dataActualizar.negocioId = parseInt(negocioId);
    }

    const montoRecaudado = parseFloat(existente.montoRecaudado || 0);
    if (req.user.rol !== 'cliente' || montoRecaudado === 0) {
      if (metaRecaudacion !== undefined) dataActualizar.metaRecaudacion = metaRecaudacion;
    }

    const campana = await prisma.campana.update({
      where: { id },
      data: dataActualizar,
      include: includeBase,
    });

    await registrarHistorial(req.user.id, 'UPDATE', campana.id, `Campaña actualizada: "${campana.titulo}"`, req.ip);

    res.json({ success: true, message: 'Campaña actualizada exitosamente', data: campana });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al actualizar campaña', error: error.message });
  }
};

const actualizarEstadoCampana = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { estado } = req.body;

    const existente = await prisma.campana.findUnique({ where: { id } });
    if (!existente) return res.status(404).json({ success: false, message: 'Campaña no encontrada' });

    const campana = await prisma.campana.update({
      where: { id },
      data: { estado },
      include: includeBase,
    });

    await registrarHistorial(req.user.id, 'CAMBIO_ESTADO', campana.id,
      `Estado de campaña cambiado a "${estado}": "${campana.titulo}"`, req.ip);

    res.json({ success: true, message: 'Estado actualizado exitosamente', data: campana });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al actualizar estado', error: error.message });
  }
};

const toggleActivoCampana = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existente = await prisma.campana.findUnique({ where: { id } });
    if (!existente) return res.status(404).json({ success: false, message: 'Campaña no encontrada' });

    const campana = await prisma.campana.update({
      where: { id },
      data: { activo: !existente.activo },
      include: includeBase,
    });

    const accionTexto = campana.activo ? 'activada' : 'desactivada';
    await registrarHistorial(req.user.id, 'TOGGLE_ACTIVO', campana.id,
      `Campaña ${accionTexto}: "${campana.titulo}"`, req.ip);

    res.json({ success: true, message: `Campaña ${accionTexto} exitosamente`, data: campana });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al cambiar estado', error: error.message });
  }
};

module.exports = {
  obtenerCampanas,
  obtenerCampanasPublicas,
  obtenerCampanaPorId,
  crearCampana,
  actualizarCampana,
  actualizarEstadoCampana,
  toggleActivoCampana,
};