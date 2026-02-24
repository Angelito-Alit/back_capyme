// src/controllers/programas.controller.js
const { prisma } = require('../config/database');
const { registrar } = require('../utils/historial');
// Helper al inicio del archivo (después de los requires):
const registrarHistorial = async (usuarioId, accion, tablaAfectada, registroId, descripcion, ipAddress) => {
  try {
    await prisma.historialAccion.create({
      data: { 
        usuarioId, 
        accion, 
        tablaAfectada, 
        registroId, 
        descripcion, 
        ipAddress: ipAddress || null 
      }
    });
  } catch (error) {
    // Silenciamos el error para no interrumpir el flujo principal
    console.error('Error al registrar historial:', error);
  }
};

const obtenerProgramas = async (req, res) => {
  try {
    const { activo, categoriaId, municipio, estado } = req.query;

    const where = {};
    if (activo !== undefined) where.activo = activo === 'true';
    if (categoriaId) where.categoriaNegocioId = parseInt(categoriaId);
    if (municipio) where.municipio = { contains: municipio };
    if (estado) where.estado = { contains: estado };

    const programas = await prisma.programa.findMany({
      where,
      include: {
        categoria: true,
        creador: {
          select: { id: true, nombre: true, apellido: true }
        }
      },
      orderBy: { fechaCreacion: 'desc' }
    });

    res.json({ success: true, data: programas });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener programas', error: error.message });
  }
};

const obtenerProgramaPorId = async (req, res) => {
  try {
    const programa = await prisma.programa.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        categoria: true,
        creador: { select: { id: true, nombre: true, apellido: true } }
      }
    });

    if (!programa) return res.status(404).json({ success: false, message: 'Programa no encontrado' });

    res.json({ success: true, data: programa });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener programa', error: error.message });
  }
};

const obtenerPreguntasPrograma = async (req, res) => {
  try {
    const preguntas = await prisma.programaPregunta.findMany({
      where: { programaId: parseInt(req.params.id), activa: true },
      include: { pregunta: true },
      orderBy: { orden: 'asc' }
    });

    res.json({ success: true, data: preguntas });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener preguntas del programa', error: error.message });
  }
};

const crearPrograma = async (req, res) => {
  try {
    const { activo, ...data } = req.body;
    const programa = await prisma.programa.create({
      data: { ...data, creadoPor: req.user.id },
      include: { categoria: true }
    });

    // Registrar en historial antes de enviar respuesta
    await registrarHistorial(
      req.user.id, 
      'CREATE', 
      'programas', 
      programa.id,
      `Programa creado: "${programa.nombre}"`, 
      req.ip
    );

    res.status(201).json({ success: true, message: 'Programa creado exitosamente', data: programa });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al crear programa', error: error.message });
  }
};

const actualizarPrograma = async (req, res) => {
  try {
    const { activo, ...dataActualizar } = req.body;
    const programa = await prisma.programa.update({
      where: { id: parseInt(req.params.id) },
      data: dataActualizar,
      include: { categoria: true }
    });

    // Registrar en historial antes de enviar respuesta
    await registrarHistorial(
      req.user.id, 
      'UPDATE', 
      'programas', 
      programa.id,
      `Programa actualizado: "${programa.nombre}"`, 
      req.ip
    );

    res.json({ success: true, message: 'Programa actualizado exitosamente', data: programa });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al actualizar programa', error: error.message });
  }
};

const eliminarPrograma = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    // Primero buscar el programa para obtener su nombre
    const prog = await prisma.programa.findUnique({ 
      where: { id } 
    });

    if (!prog) {
      return res.status(404).json({ success: false, message: 'Programa no encontrado' });
    }

    // Eliminar el programa
    await prisma.programa.delete({ where: { id } });

    // Registrar en historial después de eliminar
    await registrarHistorial(
      req.user.id, 
      'DELETE', 
      'programas', 
      id,
      `Programa eliminado: "${prog?.nombre}"`, 
      req.ip
    );

    res.json({ success: true, message: 'Programa eliminado exitosamente' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al eliminar programa', error: error.message });
  }
};

const toggleActivoPrograma = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const programa = await prisma.programa.findUnique({ where: { id } });
    if (!programa) return res.status(404).json({ success: false, message: 'Programa no encontrado' });

    const updated = await prisma.programa.update({
      where: { id },
      data: { activo: !programa.activo },
      include: { categoria: true }
    });

    // Registrar en historial antes de enviar respuesta
    await registrarHistorial(
      req.user.id, 
      'TOGGLE_ACTIVO', 
      'programas', 
      updated.id,
      `Programa ${updated.activo ? 'activado' : 'desactivado'}: "${updated.nombre}"`, 
      req.ip
    );

    res.json({
      success: true,
      message: `Programa ${updated.activo ? 'activado' : 'desactivado'} exitosamente`,
      data: updated
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al cambiar estado', error: error.message });
  }
};

const asignarPregunta = async (req, res) => {
  try {
    const { preguntaId, orden } = req.body;
    const programaId = parseInt(req.params.id);

    // Obtener información del programa y la pregunta para el historial
    const programa = await prisma.programa.findUnique({
      where: { id: programaId },
      select: { nombre: true }
    });

    const pregunta = await prisma.pregunta.findUnique({
      where: { id: parseInt(preguntaId) },
      select: { texto: true }
    });

    const programaPregunta = await prisma.programaPregunta.create({
      data: { programaId, preguntaId, orden: orden || 0 },
      include: { pregunta: true }
    });

    // Registrar en historial la asignación de pregunta
    await registrarHistorial(
      req.user.id, 
      'ASIGNAR_PREGUNTA', 
      'programas_preguntas', 
      programaPregunta.id,
      `Pregunta asignada al programa "${programa?.nombre}": "${pregunta?.texto || 'Pregunta ID: ' + preguntaId}"`, 
      req.ip
    );

    res.status(201).json({ success: true, message: 'Pregunta asignada exitosamente', data: programaPregunta });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al asignar pregunta', error: error.message });
  }
};

const desasignarPregunta = async (req, res) => {
  try {
    const programaId = parseInt(req.params.programaId);
    const preguntaId = parseInt(req.params.preguntaId);

    // Obtener información del programa y la pregunta para el historial
    const programa = await prisma.programa.findUnique({
      where: { id: programaId },
      select: { nombre: true }
    });

    const pregunta = await prisma.pregunta.findUnique({
      where: { id: preguntaId },
      select: { texto: true }
    });

    // Buscar el registro antes de eliminarlo para obtener su ID
    const programaPregunta = await prisma.programaPregunta.findFirst({
      where: {
        programaId,
        preguntaId
      }
    });

    await prisma.programaPregunta.deleteMany({
      where: {
        programaId,
        preguntaId
      }
    });

    // Registrar en historial la desasignación de pregunta
    if (programaPregunta) {
      await registrarHistorial(
        req.user.id, 
        'DESASIGNAR_PREGUNTA', 
        'programas_preguntas', 
        programaPregunta.id,
        `Pregunta desasignada del programa "${programa?.nombre}": "${pregunta?.texto || 'Pregunta ID: ' + preguntaId}"`, 
        req.ip
      );
    }

    res.json({ success: true, message: 'Pregunta desasignada exitosamente' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al desasignar pregunta', error: error.message });
  }
};

module.exports = {
  obtenerProgramas,
  obtenerProgramaPorId,
  obtenerPreguntasPrograma,
  crearPrograma,
  actualizarPrograma,
  eliminarPrograma,
  toggleActivoPrograma,
  asignarPregunta,
  desasignarPregunta
};