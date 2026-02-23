// src/controllers/postulaciones.controller.js
const { prisma } = require('../config/database');

// ─── includeCompleto: reutilizable en todas las queries ───────────────────────
const includeCompleto = {
  negocio: {
    include: {
      categoria: true,
      usuario: { select: { id: true, nombre: true, apellido: true, email: true, telefono: true } }
    }
  },
  programa: { include: { categoria: true } },
  usuario: { select: { id: true, nombre: true, apellido: true, email: true, telefono: true } },
  respuestas: {
    include: { pregunta: true },
    orderBy: { pregunta: { orden: 'asc' } }
  }
};

const obtenerPostulaciones = async (req, res) => {
  try {
    const { estado, programaId, negocioId, estadoGeo, municipio } = req.query;

    const where = {};
    if (estado) where.estado = estado;
    if (programaId) where.programaId = parseInt(programaId);
    if (negocioId) where.negocioId = parseInt(negocioId);
    if (estadoGeo) where.estadoGeo = { contains: estadoGeo };
    if (municipio) where.municipio = { contains: municipio };
    // Cliente solo ve sus propias postulaciones
    if (req.user.rol === 'cliente') where.usuarioId = req.user.id;

    const postulaciones = await prisma.postulacion.findMany({
      where,
      include: includeCompleto,
      orderBy: { fechaPostulacion: 'desc' }
    });

    res.json({ success: true, data: postulaciones });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener postulaciones', error: error.message });
  }
};

const obtenerMisPostulaciones = async (req, res) => {
  try {
    const postulaciones = await prisma.postulacion.findMany({
      where: { usuarioId: req.user.id },
      include: includeCompleto,
      orderBy: { fechaPostulacion: 'desc' }
    });

    res.json({ success: true, data: postulaciones });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener mis postulaciones', error: error.message });
  }
};

const obtenerPostulacionPorId = async (req, res) => {
  try {
    const postulacion = await prisma.postulacion.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        ...includeCompleto,
        trabajadoresJCF: true
      }
    });

    if (!postulacion) {
      return res.status(404).json({ success: false, message: 'Postulación no encontrada' });
    }

    if (req.user.rol === 'cliente' && postulacion.usuarioId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'No tienes permiso para ver esta postulación' });
    }

    res.json({ success: true, data: postulacion });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener postulación', error: error.message });
  }
};

const crearPostulacion = async (req, res) => {
  try {
    const { negocioId, programaId, usuarioId: usuarioIdBody, estadoGeo, municipio, respuestas } = req.body;

    if (!negocioId || !programaId) {
      return res.status(400).json({ success: false, message: 'negocioId y programaId son requeridos' });
    }

    // Admin y colaborador pueden postular a nombre de un usuario específico
    const usuarioId = (['admin', 'colaborador'].includes(req.user.rol)) && usuarioIdBody
      ? parseInt(usuarioIdBody)
      : req.user.id;

    // Verificar que el negocio existe
    const negocio = await prisma.negocio.findUnique({ where: { id: parseInt(negocioId) } });
    if (!negocio) {
      return res.status(404).json({ success: false, message: 'Negocio no encontrado' });
    }

    // Cliente solo puede postular sus propios negocios
    if (req.user.rol === 'cliente' && negocio.usuarioId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'No tienes permiso para postular este negocio' });
    }

    // Verificar que el programa existe y está activo
    const programa = await prisma.programa.findUnique({ where: { id: parseInt(programaId) } });
    if (!programa) {
      return res.status(404).json({ success: false, message: 'Programa no encontrado' });
    }
    if (!programa.activo) {
      return res.status(400).json({ success: false, message: 'El programa no está disponible actualmente' });
    }

    // Evitar duplicados: mismo negocio + mismo programa
    const duplicado = await prisma.postulacion.findFirst({
      where: { negocioId: parseInt(negocioId), programaId: parseInt(programaId) }
    });
    if (duplicado) {
      return res.status(400).json({
        success: false,
        message: 'Este negocio ya está postulado en este programa'
      });
    }

    const postulacion = await prisma.postulacion.create({
      data: {
        negocioId: parseInt(negocioId),
        programaId: parseInt(programaId),
        usuarioId,
        estadoGeo: estadoGeo || null,
        municipio: municipio || null,
        respuestas: { create: respuestas || [] }
      },
      include: includeCompleto
    });

    res.status(201).json({ success: true, message: 'Postulación creada exitosamente', data: postulacion });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al crear postulación', error: error.message });
  }
};

const actualizarPostulacion = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { estadoGeo, municipio, notasAdmin, respuestas } = req.body;

    const existente = await prisma.postulacion.findUnique({ where: { id } });
    if (!existente) {
      return res.status(404).json({ success: false, message: 'Postulación no encontrada' });
    }

    const dataActualizar = {};
    if (estadoGeo !== undefined) dataActualizar.estadoGeo = estadoGeo || null;
    if (municipio !== undefined) dataActualizar.municipio = municipio || null;
    if (notasAdmin !== undefined) dataActualizar.notasAdmin = notasAdmin;

    await prisma.postulacion.update({ where: { id }, data: dataActualizar });

    if (respuestas) {
      await prisma.respuestaPostulacion.deleteMany({ where: { postulacionId: id } });
      if (respuestas.length > 0) {
        await prisma.respuestaPostulacion.createMany({
          data: respuestas.map(r => ({
            postulacionId: id,
            preguntaId: r.preguntaId,
            respuesta: r.respuesta
          }))
        });
      }
    }

    const postulacion = await prisma.postulacion.findUnique({ where: { id }, include: includeCompleto });
    res.json({ success: true, message: 'Postulación actualizada exitosamente', data: postulacion });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al actualizar postulación', error: error.message });
  }
};

const actualizarEstado = async (req, res) => {
  try {
    const { estado, notasAdmin } = req.body;

    if (!estado) {
      return res.status(400).json({ success: false, message: 'El estado es requerido' });
    }

    const postulacion = await prisma.postulacion.update({
      where: { id: parseInt(req.params.id) },
      data: { estado, ...(notasAdmin !== undefined && { notasAdmin }) },
      include: includeCompleto
    });

    res.json({ success: true, message: 'Estado actualizado exitosamente', data: postulacion });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al actualizar estado', error: error.message });
  }
};

const toggleActivoPostulacion = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existente = await prisma.postulacion.findUnique({ where: { id } });

    if (!existente) {
      return res.status(404).json({ success: false, message: 'Postulación no encontrada' });
    }

    // Toggle: si está completada → pendiente, cualquier otro → completada
    const nuevoEstado = existente.estado === 'completada' ? 'pendiente' : 'completada';

    const updated = await prisma.postulacion.update({
      where: { id },
      data: { estado: nuevoEstado },
      include: includeCompleto
    });

    res.json({
      success: true,
      message: `Postulación marcada como ${nuevoEstado}`,
      data: updated
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al cambiar estado', error: error.message });
  }
};

const eliminarPostulacion = async (req, res) => {
  try {
    await prisma.postulacion.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true, message: 'Postulación eliminada exitosamente' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al eliminar postulación', error: error.message });
  }
};

module.exports = {
  obtenerPostulaciones,
  obtenerMisPostulaciones,
  obtenerPostulacionPorId,
  crearPostulacion,
  actualizarPostulacion,
  actualizarEstado,
  toggleActivoPostulacion,
  eliminarPostulacion
};