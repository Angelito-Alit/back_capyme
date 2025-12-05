// src/controllers/categorias.controller.js
const { prisma } = require('../config/database');

const obtenerCategorias = async (req, res) => {
  try {
    const { activo } = req.query;
    
    const where = {};
    if (activo !== undefined) where.activo = activo === 'true';

    const categorias = await prisma.categoriaNegocio.findMany({
      where,
      orderBy: { nombre: 'asc' }
    });

    res.json({
      success: true,
      data: categorias
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener categorías',
      error: error.message
    });
  }
};

const obtenerCategoriaPorId = async (req, res) => {
  try {
    const categoria = await prisma.categoriaNegocio.findUnique({
      where: { id: parseInt(req.params.id) }
    });

    if (!categoria) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }

    res.json({
      success: true,
      data: categoria
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener categoría',
      error: error.message
    });
  }
};

const crearCategoria = async (req, res) => {
  try {
    const categoria = await prisma.categoriaNegocio.create({
      data: req.body
    });

    res.status(201).json({
      success: true,
      message: 'Categoría creada exitosamente',
      data: categoria
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al crear categoría',
      error: error.message
    });
  }
};

const actualizarCategoria = async (req, res) => {
  try {
    const categoria = await prisma.categoriaNegocio.update({
      where: { id: parseInt(req.params.id) },
      data: req.body
    });

    res.json({
      success: true,
      message: 'Categoría actualizada exitosamente',
      data: categoria
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al actualizar categoría',
      error: error.message
    });
  }
};

const eliminarCategoria = async (req, res) => {
  try {
    await prisma.categoriaNegocio.delete({
      where: { id: parseInt(req.params.id) }
    });

    res.json({
      success: true,
      message: 'Categoría eliminada exitosamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al eliminar categoría',
      error: error.message
    });
  }
};

module.exports = {
  obtenerCategorias,
  obtenerCategoriaPorId,
  crearCategoria,
  actualizarCategoria,
  eliminarCategoria
};