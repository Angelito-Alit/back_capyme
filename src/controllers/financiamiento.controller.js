const { prisma } = require('../config/database');

const obtenerFormularios = async (req, res) => {
  try {
    const { estado, negocioId } = req.query;
    
    const where = {};
    if (estado) where.estado = estado;
    if (negocioId) where.negocioId = parseInt(negocioId);

    if (req.user.rol === 'cliente') {
      where.usuarioId = req.user.id;
    }

    const formularios = await prisma.formularioFinanciamiento.findMany({
      where,
      include: {
        negocio: {
          include: {
            categoria: true
          }
        },
        usuario: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            email: true
          }
        }
      },
      orderBy: { fechaSolicitud: 'desc' }
    });

    res.json({
      success: true,
      data: formularios
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener formularios',
      error: error.message
    });
  }
};

const obtenerFormularioPorId = async (req, res) => {
  try {
    const formulario = await prisma.formularioFinanciamiento.findUnique({
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
    });

    if (!formulario) {
      return res.status(404).json({
        success: false,
        message: 'Formulario no encontrado'
      });
    }

    if (req.user.rol === 'cliente' && formulario.usuarioId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para ver este formulario'
      });
    }

    res.json({
      success: true,
      data: formulario
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener formulario',
      error: error.message
    });
  }
};

const crearFormulario = async (req, res) => {
  try {
    const { negocioId } = req.body;

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
        message: 'No tienes permiso para crear formulario para este negocio'
      });
    }

    const formulario = await prisma.formularioFinanciamiento.create({
      data: {
        ...req.body,
        usuarioId: req.user.id
      },
      include: {
        negocio: true,
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

    res.status(201).json({
      success: true,
      message: 'Formulario creado exitosamente',
      data: formulario
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al crear formulario',
      error: error.message
    });
  }
};

const actualizarFormulario = async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const formularioExistente = await prisma.formularioFinanciamiento.findUnique({
      where: { id }
    });

    if (!formularioExistente) {
      return res.status(404).json({
        success: false,
        message: 'Formulario no encontrado'
      });
    }

    if (req.user.rol === 'cliente' && formularioExistente.usuarioId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para editar este formulario'
      });
    }

    const formulario = await prisma.formularioFinanciamiento.update({
      where: { id },
      data: req.body,
      include: {
        negocio: true,
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
      message: 'Formulario actualizado exitosamente',
      data: formulario
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al actualizar formulario',
      error: error.message
    });
  }
};

const actualizarEstado = async (req, res) => {
  try {
    const { estado } = req.body;

    const formulario = await prisma.formularioFinanciamiento.update({
      where: { id: parseInt(req.params.id) },
      data: { estado },
      include: {
        negocio: true,
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
      message: 'Estado actualizado exitosamente',
      data: formulario
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al actualizar estado',
      error: error.message
    });
  }
};

const eliminarFormulario = async (req, res) => {
  try {
    await prisma.formularioFinanciamiento.delete({
      where: { id: parseInt(req.params.id) }
    });

    res.json({
      success: true,
      message: 'Formulario eliminado exitosamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al eliminar formulario',
      error: error.message
    });
  }
};

module.exports = {
  obtenerFormularios,
  obtenerFormularioPorId,
  crearFormulario,
  actualizarFormulario,
  actualizarEstado,
  eliminarFormulario
};