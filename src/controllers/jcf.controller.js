const { prisma } = require('../config/database');

const registrarHistorial = async (usuarioId, accion, registroId, descripcion, ip) => {
  try {
    await prisma.historialAccion.create({
      data: { usuarioId, accion, tablaAfectada: 'jovenes_jcf', registroId, descripcion, ipAddress: ip || null }
    });
  } catch {}
};

const includeBase = {
  usuario: { select: { id: true, nombre: true, apellido: true, email: true } },
  negocio: {
    select: {
      id: true,
      nombreNegocio: true,
      usuarioId: true,
      estado: true,
      usuario: { select: { id: true, nombre: true, apellido: true, email: true } }
    }
  },
  postulacion: {
    select: {
      id: true,
      negocio: { select: { id: true, nombreNegocio: true } },
      programa: { select: { id: true, nombre: true } },
    }
  }
};

const obtenerJovenes = async (req, res) => {
  try {
    const { activo, municipio, buscar, postulacionId } = req.query;

    const where = {};
    if (activo !== undefined) where.activo = activo === 'true';
    if (municipio) where.municipio = { contains: municipio };
    if (postulacionId) where.postulacionId = parseInt(postulacionId);
    if (buscar) {
      where.OR = [
        { nombre: { contains: buscar } },
        { apellido: { contains: buscar } },
        { curp: { contains: buscar } },
        { correo: { contains: buscar } },
      ];
    }
    if (req.user.rol === 'cliente') {
      where.usuarioId = req.user.id;
    }

    const jovenes = await prisma.jovenJcf.findMany({
      where,
      include: includeBase,
      orderBy: { fechaRegistro: 'desc' }
    });

    res.json({ success: true, data: jovenes });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener jóvenes JCF', error: error.message });
  }
};

const obtenerJovenPorId = async (req, res) => {
  try {
    const joven = await prisma.jovenJcf.findUnique({
      where: { id: parseInt(req.params.id) },
      include: includeBase
    });

    if (!joven) return res.status(404).json({ success: false, message: 'Joven no encontrado' });

    if (req.user.rol === 'cliente' && joven.usuarioId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'No tienes permiso para ver este registro' });
    }

    res.json({ success: true, data: joven });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener joven', error: error.message });
  }
};

const crearJoven = async (req, res) => {
  try {
    const { activo, urlRecurso, usuarioId: usuarioIdBody, negocioId, ...data } = req.body;

    const usuarioId = (['admin', 'colaborador'].includes(req.user.rol)) && usuarioIdBody
      ? parseInt(usuarioIdBody)
      : req.user.id;

    // ← Convertir fechas a ISO-8601 DateTime
    if (data.fechaInicio) data.fechaInicio = new Date(data.fechaInicio).toISOString();
    if (data.fechaTermino) data.fechaTermino = new Date(data.fechaTermino).toISOString();

    const joven = await prisma.jovenJcf.create({
      data: {
        ...data,
        usuarioId,
        ...(negocioId ? { negocioId: parseInt(negocioId) } : {}),
      },
      include: includeBase
    });

    await registrarHistorial(req.user.id, 'CREATE', joven.id,
      `Joven JCF creado: "${joven.nombre} ${joven.apellido}"`, req.ip);

    res.status(201).json({ success: true, message: 'Joven creado exitosamente', data: joven });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al crear joven', error: error.message });
  }
};

const actualizarJoven = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existente = await prisma.jovenJcf.findUnique({ where: { id } });
    if (!existente) return res.status(404).json({ success: false, message: 'Joven no encontrado' });

    const { activo, urlRecurso, usuarioId: usuarioIdBody, negocioId, ...dataActualizar } = req.body;

    // ← Convertir fechas a ISO-8601 DateTime
    if (dataActualizar.fechaInicio) dataActualizar.fechaInicio = new Date(dataActualizar.fechaInicio).toISOString();
    if (dataActualizar.fechaTermino) dataActualizar.fechaTermino = new Date(dataActualizar.fechaTermino).toISOString();

    const joven = await prisma.jovenJcf.update({
      where: { id },
      data: {
        ...dataActualizar,
        ...(negocioId !== undefined ? { negocioId: negocioId ? parseInt(negocioId) : null } : {}),
      },
      include: includeBase
    });

    await registrarHistorial(req.user.id, 'UPDATE', joven.id,
      `Joven JCF actualizado: "${joven.nombre} ${joven.apellido}"`, req.ip);

    res.json({ success: true, message: 'Joven actualizado exitosamente', data: joven });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al actualizar joven', error: error.message });
  }
};

const toggleActivoJoven = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existente = await prisma.jovenJcf.findUnique({ where: { id } });
    if (!existente) return res.status(404).json({ success: false, message: 'Joven no encontrado' });

    const joven = await prisma.jovenJcf.update({
      where: { id },
      data: { activo: !existente.activo },
      include: includeBase
    });

    const accionTexto = joven.activo ? 'activado' : 'desactivado';
    await registrarHistorial(req.user.id, 'TOGGLE_ACTIVO', joven.id,
      `Joven JCF ${accionTexto}: "${joven.nombre} ${joven.apellido}"`, req.ip);

    res.json({ success: true, message: `Joven ${accionTexto} exitosamente`, data: joven });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al cambiar estado', error: error.message });
  }
};

const actualizarRecurso = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { urlRecurso } = req.body;

    const existente = await prisma.jovenJcf.findUnique({ where: { id } });
    if (!existente) return res.status(404).json({ success: false, message: 'Joven no encontrado' });

    const joven = await prisma.jovenJcf.update({
      where: { id },
      data: { urlRecurso: urlRecurso || null },
      include: includeBase
    });

    await registrarHistorial(req.user.id, 'UPDATE_RECURSO', joven.id,
      `Recurso actualizado para joven JCF: "${joven.nombre} ${joven.apellido}"`, req.ip);

    res.json({ success: true, message: 'Recurso actualizado exitosamente', data: joven });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al actualizar recurso', error: error.message });
  }
};

module.exports = {
  obtenerJovenes,
  obtenerJovenPorId,
  crearJoven,
  actualizarJoven,
  toggleActivoJoven,
  actualizarRecurso
};