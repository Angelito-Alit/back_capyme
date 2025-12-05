// src/controllers/programas.controller.js
const { prisma } = require('../config/database');

const obtenerProgramas = async (req, res) => {
  try {
    const { activo, categoriaId } = req.query;
    
    const where = {};
    if (activo !== undefined) where.activo = activo === 'true';
    if (categoriaId) where.categoriaNegocioId = parseInt(categoriaId);

    const programas = await prisma.programa.findMany({
      where,
      include: {
        categoria: true,
        creador: {
          select: {
            id: true,
            nombre: true,
            apellido: true
          }
        }
      },
      orderBy: { fechaCreacion: 'desc' }
    });

    res.json({
      success: true,
      data: programas
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener programas',
      error: error.message
    });
  }
};

const obtenerProgramaPorId = async (req, res) => {
  try {
    const programa = await prisma.programa.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        categoria: true,
        creador: {
          select: {
            id: true,
            nombre: true,
            apellido: true
          }
        }
      }
    });

    if (!programa) {
      return res.status(404).json({
        success: false,
        message: 'Programa no encontrado'
      });
    }

    res.json({
      success: true,
      data: programa
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener programa',
      error: error.message
    });
  }
};

const obtenerPreguntasPrograma = async (req, res) => {
  try {
    const preguntas = await prisma.programaPregunta.findMany({
      where: { 
        programaId: parseInt(req.params.id),
        activa: true
      },
      include: {
        pregunta: true
      },
      orderBy: { orden: 'asc' }
    });

    res.json({
      success: true,
      data: preguntas
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener preguntas del programa',
      error: error.message
    });
  }
};

const crearPrograma = async (req, res) => {
  try {
    const programa = await prisma.programa.create({
      data: {
        ...req.body,
        creadoPor: req.user.id
      },
      include: {
        categoria: true
      }
    });

    res.status(201).json({
      success: true,
      message: 'Programa creado exitosamente',
      data: programa
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al crear programa',
      error: error.message
    });
  }
};

const actualizarPrograma = async (req, res) => {
  try {
    const programa = await prisma.programa.update({
      where: { id: parseInt(req.params.id) },
      data: req.body,
      include: {
        categoria: true
      }
    });

    res.json({
      success: true,
      message: 'Programa actualizado exitosamente',
      data: programa
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al actualizar programa',
      error: error.message
    });
  }
};

const eliminarPrograma = async (req, res) => {
  try {
    await prisma.programa.delete({
      where: { id: parseInt(req.params.id) }
    });

    res.json({
      success: true,
      message: 'Programa eliminado exitosamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al eliminar programa',
      error: error.message
    });
  }
};

const asignarPregunta = async (req, res) => {
  try {
    const { preguntaId, orden } = req.body;
    const programaId = parseInt(req.params.id);

    const programaPregunta = await prisma.programaPregunta.create({
      data: {
        programaId,
        preguntaId,
        orden: orden || 0
      },
      include: {
        pregunta: true
      }
    });

    res.status(201).json({
      success: true,
      message: 'Pregunta asignada exitosamente',
      data: programaPregunta
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al asignar pregunta',
      error: error.message
    });
  }
};

const desasignarPregunta = async (req, res) => {
  try {
    const programaId = parseInt(req.params.programaId);
    const preguntaId = parseInt(req.params.preguntaId);

    await prisma.programaPregunta.deleteMany({
      where: {
        programaId,
        preguntaId
      }
    });

    res.json({
      success: true,
      message: 'Pregunta desasignada exitosamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al desasignar pregunta',
      error: error.message
    });
  }
};

module.exports = {
  obtenerProgramas,
  obtenerProgramaPorId,
  obtenerPreguntasPrograma,
  crearPrograma,
  actualizarPrograma,
  eliminarPrograma,
  asignarPregunta,
  desasignar