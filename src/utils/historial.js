const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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
  } catch (e) { /* nunca romper el flujo principal */ }
};

module.exports = { registrar };