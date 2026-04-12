const { prisma } = require('../config/database');

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

    let where = {};

    if (req.user.rol === 'cliente') {

      where.OR = [
        {
          activo: true,
          estado: { in: ['aprobada', 'activa'] },
        },
        {
          negocio: { usuarioId: req.user.id },
        },
      ];

      if (negocioId) {
        where = {
          OR: [
            {
              activo: true,
              estado: { in: ['aprobada', 'activa'] },
              negocioId: parseInt(negocioId),
            },
            {
              negocio: { usuarioId: req.user.id },
              negocioId: parseInt(negocioId),
            },
          ],
        };
      }
    } else {
      if (activo !== undefined) where.activo = activo === 'true';
      if (estado) where.estado = estado;
      if (negocioId) where.negocioId = parseInt(negocioId);
    }

    if (buscar) {
      const buscarCondition = {
        OR: [
          { titulo: { contains: buscar } },
          { descripcion: { contains: buscar } },
        ],
      };
      where = where.OR
        ? { AND: [{ OR: where.OR }, buscarCondition] }
        : { ...where, ...buscarCondition };
    }

    const campanas = await prisma.campana.findMany({
      where,
      include: {
        ...includeBase,
        _count: { select: { inversiones: true } },
      },
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

    if (req.user.rol === 'cliente') {
      const esDueno  = campana.negocio.usuarioId === req.user.id;
      const esPublica = campana.activo && ['aprobada', 'activa'].includes(campana.estado);
      if (!esDueno && !esPublica) {
        return res.status(403).json({ success: false, message: 'No tienes permiso para ver esta campaña' });
      }
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
    res.json({ success: true, message: `Campaña ${accionTexto} exitosamente`, data: campana });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al cambiar estado', error: error.message });
  }
};

const obtenerMisCampanas = async (req, res) => {
  try {
    const campanas = await prisma.campana.findMany({
      where: {
        negocio: { usuarioId: req.user.id },
      },
      include: {
        negocio: {
          select: { id: true, nombreNegocio: true, usuarioId: true },
        },
        creador: { select: { id: true, nombre: true, apellido: true } },
        _count: { select: { inversiones: true } },
        inversiones: {
          where: { estadoPago: 'confirmado', activo: true },
          select: {
            id: true,
            monto: true,
            estadoPago: true,
            fechaCreacion: true,
            inversor: { select: { id: true, nombre: true, apellido: true } },
          },
          orderBy: { monto: 'desc' },
        },
      },
      orderBy: { fechaCreacion: 'desc' },
    });

    res.json({ success: true, data: campanas });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener mis campañas', error: error.message });
  }
};

const publicarActualizacion = async (req, res) => {
  try {
    const campanaId = parseInt(req.params.id);
    const { titulo, contenido } = req.body;

    if (!titulo || !contenido) {
      return res.status(400).json({ success: false, message: 'Título y contenido son requeridos' });
    }

    const campana = await prisma.campana.findUnique({
      where: { id: campanaId },
      select: { negocio: { select: { usuarioId: true } }, titulo: true },
    });

    if (!campana) return res.status(404).json({ success: false, message: 'Campaña no encontrada' });

    if (req.user.rol === 'cliente' && campana.negocio.usuarioId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'No tienes permiso para publicar en esta campaña' });
    }

    const actualizacion = await prisma.actualizacionCampana.create({
      data: { campanaId, autorId: req.user.id, titulo, contenido },
      include: { autor: { select: { id: true, nombre: true, apellido: true } } },
    });

    const inversores = await prisma.inversion.findMany({
      where: { campanaId, estadoPago: 'confirmado', activo: true },
      select: { inversorId: true },
      distinct: ['inversorId'],
    });

    if (inversores.length > 0) {
      await prisma.notificacion.createMany({
        data: inversores.map((i) => ({
          usuarioId: i.inversorId,
          tipo: 'actualizacion_campana',
          titulo: `Actualización: ${campana.titulo}`,
          mensaje: titulo,
          leida: false,
        })),
        skipDuplicates: true,
      });
    }

    res.status(201).json({ success: true, message: 'Actualización publicada', data: actualizacion });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al publicar actualización', error: error.message });
  }
};

const obtenerActualizaciones = async (req, res) => {
  try {
    const campanaId = parseInt(req.params.id);

    const campana = await prisma.campana.findUnique({
      where: { id: campanaId },
      select: { negocio: { select: { usuarioId: true } } },
    });

    if (!campana) return res.status(404).json({ success: false, message: 'Campaña no encontrada' });

    const actualizaciones = await prisma.actualizacionCampana.findMany({
      where: { campanaId, activo: true },
      include: { autor: { select: { id: true, nombre: true, apellido: true } } },
      orderBy: { fechaCreacion: 'desc' },
    });

    res.json({ success: true, data: actualizaciones });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener actualizaciones', error: error.message });
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
  obtenerMisCampanas,
  publicarActualizacion,
  obtenerActualizaciones,
};