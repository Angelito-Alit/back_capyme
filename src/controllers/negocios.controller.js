// src/controllers/negocios.controller.js
const { prisma } = require('../config/database');

const obtenerNegocios = async (req, res) => {
  try {
    const { categoriaId, activo, buscar } = req.query;
    
    const where = {};
    if (categoriaId) where.categoriaId = parseInt(categoriaId);
    if (activo !== undefined) where.activo = activo === 'true';
    if (buscar) {
      where.OR = [
        { nombreNegocio: { contains: buscar } },
        { rfc: { contains: buscar } }
      ];
    }

    if (req.user.rol === 'cliente') {
      where.usuarioId = req.user.id;
    }

    const negocios = await prisma.negocio.findMany({
      where,
      include: {
        usuario: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            email: true
          }
        },
        categoria: true
      },
      orderBy: { fechaRegistro: 'desc' }
    });

    res.json({
      success: true,
      data: negocios
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener negocios',
      error: error.message
    });
  }
};

const obtenerMisNegocios = async (req, res) => {
  try {
    const negocios = await prisma.negocio.findMany({
      where: { usuarioId: req.user.id },
      include: {
        categoria: true
      },
      orderBy: { fechaRegistro: 'desc' }
    });

    res.json({
      success: true,
      data: negocios
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener negocios',
      error: error.message
    });
  }
};

const obtenerNegocioPorId = async (req, res) => {
  try {
    const negocio = await prisma.negocio.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        usuario: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            email: true,
            telefono: true
          }
        },
        categoria: true
      }
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
        message: 'No tienes permiso para ver este negocio'
      });
    }

    res.json({
      success: true,
      data: negocio
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener negocio',
      error: error.message
    });
  }
};

const crearNegocio = async (req, res) => {
  try {
    const usuarioId = req.user.rol === 'cliente' ? req.user.id : req.body.usuarioId;

    const negocio = await prisma.negocio.create({
      data: {
        ...req.body,
        usuarioId,
        categoriaId: parseInt(req.body.categoriaId)
      },
      include: {
        categoria: true,
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
      message: 'Negocio creado exitosamente',
      data: negocio
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al crear negocio',
      error: error.message
    });
  }
};

const actualizarNegocio = async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const negocioExistente = await prisma.negocio.findUnique({
      where: { id }
    });

    if (!negocioExistente) {
      return res.status(404).json({
        success: false,
        message: 'Negocio no encontrado'
      });
    }

    if (req.user.rol === 'cliente' && negocioExistente.usuarioId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para editar este negocio'
      });
    }

    const negocio = await prisma.negocio.update({
      where: { id },
      data: req.body,
      include: {
        categoria: true,
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
      message: 'Negocio actualizado exitosamente',
      data: negocio
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al actualizar negocio',
      error: error.message
    });
  }
};

const eliminarNegocio = async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    await prisma.negocio.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Negocio eliminado exitosamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al eliminar negocio',
      error: error.message
    });
  }
};

module.exports = {
  obtenerNegocios,
  obtenerMisNegocios,
  obtenerNegocioPorId,
  crearNegocio,
  actualizarNegocio,
  eliminarNegocio
};