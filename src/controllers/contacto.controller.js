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
    const {
      telefono, email, direccion, horarioAtencion,
      whatsapp, facebookUrl, instagramUrl, linkedinUrl, sitioWeb
    } = req.body;

    const updateData = {
      telefono: telefono || null,
      email: email || null,
      direccion: direccion || null,
      horarioAtencion: horarioAtencion || null,
      whatsapp: whatsapp || null,
      facebookUrl: facebookUrl || null,
      instagramUrl: instagramUrl || null,
      linkedinUrl: linkedinUrl || null,
      sitioWeb: sitioWeb || null
    };

    let contacto = await prisma.contactoCapyme.findFirst();

    if (!contacto) {
      contacto = await prisma.contactoCapyme.create({
        data: updateData
      });
    } else {
      contacto = await prisma.contactoCapyme.update({
        where: { id: contacto.id },
        data: updateData
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