// src/controllers/postulaciones.controller.js
const { prisma } = require('../config/database');

const obtenerPostulaciones = async (req, res) => {
  try {
    const { estado, programaId, negocioId } = req.query;
    
    const where = {};
    if (estado) where.estado = estado;
    if (programaId) where.programaId = parseInt(programaId);
    if (negocioId) where.negocioId = parseInt(negocioId);

    if (req.user.rol === 'cliente') {
      where.usuarioId = req.user.id;
    }

    const postulaciones = await prisma.postulacion.findMany({
      where,
      include: {
        negocio: {
          include: {
            categoria: true
          }
        },
        programa: true,
        usuario: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            email: true
          }
        },
        respuestas: {
          include: {
            pregunta: true
          }
        }
      },
      orderBy: { fechaPostulacion: 'desc' }
    });

    res.json({
      success: true,
      data: postulaciones
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener postulaciones',
      error: error.message
    });
  }
};

const obtenerMisPostulaciones = async (req, res) => {
  try {
    const postulaciones = await prisma.postulacion.findMany({
      where: { usuarioId: req.user.id },
      include: {
        negocio: true,
        programa: true,
        respuestas: {
          include: {
            pregunta: true
          }
        }
      },
      orderBy: { fechaPostulacion: 'desc' }
    });

    res.json({
      success: true,
      data: postulaciones
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener postulaciones',
      error: error.message
    });
  }
};

const obtenerPostulacionPorId = async (req, res) => {
  try {
    const postulacion = await prisma.postulacion.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        negocio: {
          include: {
            categoria: true,
            usuario: {
              select: {
                id: true,
                nombre: true,
                apellido: true,
                email: true,
                telefono: true
              }
            }
          }
        },
        programa: {
          include: {
            categoria: true
          }
        },
        usuario: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            email: true,
            telefono: true
          }
        },
        respuestas: {
          include: {
            pregunta: true
          },
          orderBy: {
            pregunta: {
              orden: 'asc'
            }
          }
        },
        trabajadoresJCF: true
      }
    });

    if (!postulacion) {
      return res.status(404).json({
        success: false,
        message: 'Postulación no encontrada'
      });
    }

    if (req.user.rol === 'cliente' && postulacion.usuarioId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para ver esta postulación'
      });
    }

    res.json({
      success: true,
      data: postulacion
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener postulación',
      error: error.message
    });
  }
};

const crearPostulacion = async (req, res) => {
  try {
    const { negocioId, programaId, respuestas } = req.body;

    const negocio = await prisma.negocio.findUnique({
      where: { id: negocioId }
    });

    if (!negocio) {
      return res.status(404).json({
        success: false,
        message: 'Negocio no encontrado'
      });
    }

    if (req.user.rol === 'cliente' && negocio.usuarioId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para postular este negocio'
      });
    }

    const postulacion = await prisma.postulacion.create({
      data: {
        negocioId,
        programaId,
        usuarioId: req.user.id,
        respuestas: {
          create: respuestas || []
        }
      },
      include: {
        negocio: true,
        programa: true,
        respuestas: {
          include: {
            pregunta: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Postulación creada exitosamente',
      data: postulacion
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al crear postulación',
      error: error.message
    });
  }
};

const actualizarPostulacion = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { respuestas } = req.body;

    const postulacionExistente = await prisma.postulacion.findUnique({
      where: { id }
    });

    if (!postulacionExistente) {
      return res.status(404).json({
        success: false,
        message: 'Postulación no encontrada'
      });
    }

    if (req.user.rol === 'cliente' && postulacionExistente.usuarioId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para editar esta postulación'
      });
    }

    if (respuestas) {
      await prisma.respuestaPostulacion.deleteMany({
        where: { postulacionId: id }
      });

      await prisma.respuestaPostulacion.createMany({
        data: respuestas.map(r => ({
          postulacionId: id,
          preguntaId: r.preguntaId,
          respuesta: r.respuesta
        }))
      });
    }

    const postulacion = await prisma.postulacion.findUnique({
      where: { id },
      include: {
        negocio: true,
        programa: true,
        respuestas: {
          include: {
            pregunta: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Postulación actualizada exitosamente',
      data: postulacion
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al actualizar postulación',
      error: error.message
    });
  }
};

const actualizarEstado = async (req, res) => {
  try {
    const { estado, notasAdmin } = req.body;

    const postulacion = await prisma.postulacion.update({
      where: { id: parseInt(req.params.id) },
      data: {
        estado,
        notasAdmin
      },
      include: {
        negocio: true,
        programa: true,
        usuario: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            email: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Estado de postulación actualizado exitosamente',
      data: postulacion
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al actualizar estado',
      error: error.message
    });
  }
};

const eliminarPostulacion = async (req, res) => {
  try {
    await prisma.postulacion.delete({
      where: { id: parseInt(req.params.id) }
    });

    res.json({
      success: true,
      message: 'Postulación eliminada exitosamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al eliminar postulación',
      error: error.message
    });
  }
};

module.exports = {
  obtenerPostulaciones,
  obtenerMisPostulaciones,
  obtenerPostulacionPorId,
  crearPostulacion,
  actualizarPostulacion,
  actualizarEstado,
  eliminarPostulacion
};