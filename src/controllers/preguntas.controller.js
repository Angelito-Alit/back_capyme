const { prisma } = require('../config/database');

const obtenerPreguntas = async (req, res) => {
  try {
    const { activa, categoria } = req.query;
    
    const where = {};
    if (activa !== undefined) where.activa = activa === 'true';
    if (categoria) where.categoria = categoria;

    const preguntas = await prisma.preguntaFormulario.findMany({
      where,
      include: {
        creador: {
          select: {
            id: true,
            nombre: true,
            apellido: true
          }
        }
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
      message: 'Error al obtener preguntas',
      error: error.message
    });
  }
};

const obtenerPreguntaPorId = async (req, res) => {
  try {
    const pregunta = await prisma.preguntaFormulario.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        creador: {
          select: {
            id: true,
            nombre: true,
            apellido: true
          }
        }
      }
    });

    if (!pregunta) {
      return res.status(404).json({
        success: false,
        message: 'Pregunta no encontrada'
      });
    }

    res.json({
      success: true,
      data: pregunta
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener pregunta',
      error: error.message
    });
  }
};

const crearPregunta = async (req, res) => {
  try {
    const pregunta = await prisma.preguntaFormulario.create({
      data: {
        ...req.body,
        creadoPor: req.user.id
      },
      include: {
        creador: {
          select: {
            id: true,
            nombre: true,
            apellido: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Pregunta creada exitosamente',
      data: pregunta
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al crear pregunta',
      error: error.message
    });
  }
};

const actualizarPregunta = async (req, res) => {
  try {
    const pregunta = await prisma.preguntaFormulario.update({
      where: { id: parseInt(req.params.id) },
      data: req.body,
      include: {
        creador: {
          select: {
            id: true,
            nombre: true,
            apellido: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Pregunta actualizada exitosamente',
      data: pregunta
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al actualizar pregunta',
      error: error.message
    });
  }
};

const eliminarPregunta = async (req, res) => {
  try {
    await prisma.preguntaFormulario.delete({
      where: { id: parseInt(req.params.id) }
    });

    res.json({
      success: true,
      message: 'Pregunta eliminada exitosamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al eliminar pregunta',
      error: error.message
    });
  }
};

module.exports = {
  obtenerPreguntas,
  obtenerPreguntaPorId,
  crearPregunta,
  actualizarPregunta,
  eliminarPregunta
};