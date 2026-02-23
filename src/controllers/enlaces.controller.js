const { prisma } = require('../config/database');

const obtenerEnlaces = async (req, res) => {
  try {
    const { activo, tipo, categoria } = req.query;
    const where = {};
    if (activo !== undefined) where.activo = activo === 'true';
    if (tipo) where.tipo = tipo;
    if (categoria) where.categoria = { contains: categoria };

    if (req.user.rol === 'cliente') {
      where.visiblePara = { in: ['todos', 'clientes'] };
    } else if (req.user.rol === 'colaborador') {
      where.visiblePara = { in: ['todos', 'colaboradores', 'admin'] };
    }

    const enlaces = await prisma.enlaceRecurso.findMany({
      where,
      include: { creador: { select: { id: true, nombre: true, apellido: true } } },
      orderBy: { fechaCreacion: 'desc' },
    });

    res.json({ success: true, data: enlaces });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener catálogos', error: error.message });
  }
};

const obtenerEnlacePorId = async (req, res) => {
  try {
    const enlace = await prisma.enlaceRecurso.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { creador: { select: { id: true, nombre: true, apellido: true } } },
    });
    if (!enlace) return res.status(404).json({ success: false, message: 'Catálogo no encontrado' });
    res.json({ success: true, data: enlace });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener catálogo', error: error.message });
  }
};

const crearEnlace = async (req, res) => {
  try {
    const { creadoPor, activo, ...data } = req.body;
    const enlace = await prisma.enlaceRecurso.create({
      data: { ...data, creadoPor: req.user.id },
      include: { creador: { select: { id: true, nombre: true, apellido: true } } },
    });
    res.status(201).json({ success: true, message: 'Catálogo creado exitosamente', data: enlace });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al crear catálogo', error: error.message });
  }
};

const actualizarEnlace = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existente = await prisma.enlaceRecurso.findUnique({ where: { id } });
    if (!existente) return res.status(404).json({ success: false, message: 'Catálogo no encontrado' });

    const { creadoPor, activo, ...data } = req.body;

    const enlace = await prisma.enlaceRecurso.update({
      where: { id },
      data,
      include: { creador: { select: { id: true, nombre: true, apellido: true } } },
    });
    res.json({ success: true, message: 'Catálogo actualizado exitosamente', data: enlace });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al actualizar catálogo', error: error.message });
  }
};

const toggleActivoEnlace = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existente = await prisma.enlaceRecurso.findUnique({ where: { id } });
    if (!existente) return res.status(404).json({ success: false, message: 'Catálogo no encontrado' });

    const enlace = await prisma.enlaceRecurso.update({
      where: { id },
      data: { activo: !existente.activo },
      include: { creador: { select: { id: true, nombre: true, apellido: true } } },
    });

    const accionTexto = enlace.activo ? 'activado' : 'desactivado';
    res.json({ success: true, message: `Catálogo ${accionTexto} exitosamente`, data: enlace });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al cambiar estado', error: error.message });
  }
};

module.exports = { obtenerEnlaces, obtenerEnlacePorId, crearEnlace, actualizarEnlace, toggleActivoEnlace };