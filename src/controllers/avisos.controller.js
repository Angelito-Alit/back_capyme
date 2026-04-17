const { prisma } = require('../config/database');

const obtenerAvisos = async (req, res) => {
  try {
    const { activo, tipo } = req.query;

    const where = {};
    if (activo !== undefined) where.activo = activo === 'true';
    if (tipo) where.tipo = tipo;

    if (req.user.rol === 'cliente') {
      where.destinatario = { in: ['todos', 'clientes'] };
      where.activo = true;
    } else if (req.user.rol === 'colaborador') {
      where.destinatario = { in: ['todos', 'colaboradores'] };
    }

    const avisos = await prisma.aviso.findMany({
      where,
      include: {
        creador: { select: { id: true, nombre: true, apellido: true } },
        actualizadoPorUsuario: { select: { id: true, nombre: true, apellido: true } },
      },
      orderBy: { fechaPublicacion: 'desc' },
    });

    res.json({ success: true, data: avisos });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener avisos', error: error.message });
  }
};

const obtenerAvisoPorId = async (req, res) => {
  try {
    const aviso = await prisma.aviso.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        creador: { select: { id: true, nombre: true, apellido: true } },
        actualizadoPorUsuario: { select: { id: true, nombre: true, apellido: true } },
      },
    });

    if (!aviso) return res.status(404).json({ success: false, message: 'Aviso no encontrado' });

    res.json({ success: true, data: aviso });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener aviso', error: error.message });
  }
};

const crearAviso = async (req, res) => {
  try {
    const { activo, ...data } = req.body;

    const aviso = await prisma.aviso.create({
      data: { ...data, creadoPor: req.user.id },
      include: {
        creador: { select: { id: true, nombre: true, apellido: true } },
      },
    });

    res.status(201).json({ success: true, message: 'Aviso creado exitosamente', data: aviso });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al crear aviso', error: error.message });
  }
};

const actualizarAviso = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { activo, ...data } = req.body;

    const existente = await prisma.aviso.findUnique({ where: { id } });
    if (!existente) return res.status(404).json({ success: false, message: 'Aviso no encontrado' });

    const aviso = await prisma.aviso.update({
      where: { id },
      data: { ...data, actualizadoPor: req.user.id },
      include: {
        creador: { select: { id: true, nombre: true, apellido: true } },
        actualizadoPorUsuario: { select: { id: true, nombre: true, apellido: true } },
      },
    });

    res.json({ success: true, message: 'Aviso actualizado exitosamente', data: aviso });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al actualizar aviso', error: error.message });
  }
};

const toggleActivoAviso = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existente = await prisma.aviso.findUnique({ where: { id } });
    if (!existente) return res.status(404).json({ success: false, message: 'Aviso no encontrado' });

    const aviso = await prisma.aviso.update({
      where: { id },
      data: { activo: !existente.activo, actualizadoPor: req.user.id },
      include: {
        creador: { select: { id: true, nombre: true, apellido: true } },
      },
    });

    res.json({
      success: true,
      message: `Aviso ${aviso.activo ? 'activado' : 'desactivado'} exitosamente`,
      data: aviso,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al cambiar estado', error: error.message });
  }
};

const eliminarAviso = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existente = await prisma.aviso.findUnique({ where: { id } });
    if (!existente) return res.status(404).json({ success: false, message: 'Aviso no encontrado' });

    await prisma.aviso.delete({ where: { id } });

    res.json({ success: true, message: 'Aviso eliminado exitosamente' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al eliminar aviso', error: error.message });
  }
};

module.exports = {
  obtenerAvisos,
  obtenerAvisoPorId,
  crearAviso,
  actualizarAviso,
  toggleActivoAviso,
  eliminarAviso,
};