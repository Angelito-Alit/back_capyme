const { prisma } = require('../config/database');

const registrar = async (usuarioId, accion, tablaAfectada, registroId, descripcion, ip) => {
  try {
    await prisma.historialAccion.create({
      data: {
        usuarioId,
        accion,
        tablaAfectada: tablaAfectada || null,
        registroId:    registroId    || null,
        descripcion:   descripcion   || null,
        ipAddress:     ip            || null,
      }
    });
  } catch (e) {}
};

module.exports = { registrar };