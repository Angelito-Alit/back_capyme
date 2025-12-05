// src/controllers/contacto.controller.js
const { prisma } = require('../config/database');

const obtenerContacto = async (req, res) => {
  try {
    let contacto = await prisma.contactoCapyme.findFirst();

    if (!contacto) {
      contacto = await prisma.contactoCapyme.create({
        data: {}
      });
    }

    res.json({
      success: true,
      data: contacto
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener información de contacto',
      error: error.message
    });
  }
};

const actualizarContacto = async (req, res) => {
  try {
    let contacto = await prisma.contactoCapyme.findFirst();

    if (!contacto) {
      contacto = await prisma.contactoCapyme.create({
        data: req.body
      });
    } else {
      contacto = await prisma.contactoCapyme.update({
        where: { id: contacto.id },
        data: req.body
      });
    }

    res.json({
      success: true,
      message: 'Información de contacto actualizada exitosamente',
      data: contacto
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al actualizar información de contacto',
      error: error.message
    });
  }
};

module.exports = {
  obtenerContacto,
  actualizarContacto
};