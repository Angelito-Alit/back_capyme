const { prisma } = require('../config/database');

const obtenerTrabajadores = async (req, res) => {
  try {
    const { postulacionId, activo } = req.query;
    
    const where = {};
    if (postulacionId) where.postulacionId = parseInt(postulacionId);
    if (activo !== undefined) where.activo = activo === 'true';

    const trabajadores = await prisma.trabajadorJCF.findMany({
      where,
      include: {
        postulacion: {
          include: {
            negocio: {
              select: {
                id: true,
                nombreNegocio: true
              }
            },
            programa: {
              select: {
                id: true,
                nombre: true
              }
            }
          }
        }
      },
      orderBy: { fechaRegistro: 'desc' }
    });

    res.json({
      success: true,
      data: trabajadores
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener trabajadores',
      error: error.message
    });
  }
};

const obtenerTrabajadorPorId = async (req, res) => {
  try {
    const trabajador = await prisma.trabajadorJCF.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        postulacion: {
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
        }
      }
    });

    if (!trabajador) {
      return res.status(404).json({
        success: false,
        message: 'Trabajador no encontrado'
      });
    }

    res.json({
      success: true,
      data: trabajador
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener trabajador',
      error: error.message
    });
  }
};

const crearTrabajador = async (req, res) => {
  try {
    const trabajador = await prisma.trabajadorJCF.create({
      data: req.body,
      include: {
        postulacion: {
          include: {
            negocio: true,
            programa: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Trabajador creado exitosamente',
      data: trabajador
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al crear trabajador',
      error: error.message
    });
  }
};

const actualizarTrabajador = async (req, res) => {
  try {
    const trabajador = await prisma.trabajadorJCF.update({
      where: { id: parseInt(req.params.id) },
      data: req.body,
      include: {
        postulacion: {
          include: {
            negocio: true,
            programa: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Trabajador actualizado exitosamente',
      data: trabajador
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al actualizar trabajador',
      error: error.message
    });
  }
};

const eliminarTrabajador = async (req, res) => {
  try {
    await prisma.trabajadorJCF.delete({
      where: { id: parseInt(req.params.id) }
    });

    res.json({
      success: true,
      message: 'Trabajador eliminado exitosamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al eliminar trabajador',
      error: error.message
    });
  }
};

module.exports = {
  obtenerTrabajadores,
  obtenerTrabajadorPorId,
  crearTrabajador,
  actualizarTrabajador,
  eliminarTrabajador
};