// src/controllers/enlaces.controller.js
const { prisma } = require('../config/database');

const obtenerEnlaces = async (req, res) => {
  try {
    const { activo, tipo, categoria } = req.query;
    
    const where = {};
    if (activo !== undefined) where.activo = activo === 'true';
    if (tipo) where.tipo = tipo;
    if (categoria) where.categoria = categoria;

    if (req.user.rol === 'cliente') {
      where.visiblePara = { in: ['todos', 'clientes'] };
    } else if (req.user.rol === 'colaborador') {
      where.visiblePara = { in: ['todos', 'colaboradores'] };
    }

    const enlaces = await prisma.enlaceRecurso.findMany({
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
      orderBy: { fechaCreacion: 'desc' }
    });

    res.json({
      success: true,
      data: enlaces
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener enlaces',
      error: error.message
    });
  }
};

const obtenerEnlacePorId = async (req, res) => {
  try {
    const enlace = await prisma.enlaceRecurso.findUnique({
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

    if (!enlace) {
      return res.status(404).json({
        success: false,
        message: 'Enlace no encontrado'
      });
    }

    res.json({
      success: true,
      data: enlace
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener enlace',
      error: error.message
    });
  }
};

const crearEnlace = async (req, res) => {
  try {
    const enlace = await prisma.enlaceRecurso.create({
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
      message: 'Enlace creado exitosamente',
      data: enlace
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al crear enlace',
      error: error.message
    });
  }
};

const actualizarEnlace = async (req, res) => {
  try {
    const enlace = await prisma.enlaceRecurso.update({
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
      message: 'Enlace actualizado exitosamente',
      data: enlace
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al actualizar enlace',
      error: error.message
    });
  }
};

const eliminarEnlace = async (req, res) => {
  try {
    await prisma.enlaceRecurso.delete({
      where: { id: parseInt(req.params.id) }
    });

    res.json({
      success: true,
      message: 'Enlace eliminado exitosamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al eliminar enlace',
      error: error.message
    });
  }
};

module.exports = {
  obtenerEnlaces,
  obtenerEnlacePorId,
  crearEnlace,
  actualizarEnlace,
  eliminarEnlace
};