const { prisma } = require('../config/database');

const includeBase = {
  usuario: { select: { id: true, nombre: true, apellido: true, email: true } },
  negocio: {
    select: {
      id: true,
      nombreNegocio: true,
      usuarioId: true,
      ciudad: true,   
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
    const { activo, buscar, postulacionId, estadoGeo, municipioNegocio, estatus } = req.query;

    const where = {};
    if (activo !== undefined) where.activo = activo === 'true';
    if (postulacionId) where.postulacionId = parseInt(postulacionId);
    if (estatus) where.estatus = estatus;
    if (buscar) {
      where.OR = [
        { nombre: { contains: buscar } },
        { apellido: { contains: buscar } },
        { curp: { contains: buscar } },
        { correo: { contains: buscar } },
      ];
    }
    if (estadoGeo || municipioNegocio) {
      where.negocio = {};
      if (estadoGeo) where.negocio.estado = { contains: estadoGeo };
      if (municipioNegocio) where.negocio.ciudad = { contains: municipioNegocio };
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
    const { activo, urlRecurso, usuarioId: usuarioIdBody, negocioId, municipio, estatus, tarjetaEntregada, horarios, horarioConfirmado, ...data } = req.body;

    const usuarioId = (['admin', 'colaborador'].includes(req.user.rol)) && usuarioIdBody
      ? parseInt(usuarioIdBody)
      : req.user.id;

    const fechaInicio = data.fechaInicio ? new Date(data.fechaInicio).toISOString() : null;
    const fechaTermino = data.fechaTermino ? new Date(data.fechaTermino).toISOString() : null;

    delete data.fechaInicio;
    delete data.fechaTermino;

    const joven = await prisma.jovenJcf.create({
      data: {
        ...data,
        estatus: estatus || 'Por registrar',
        fechaInicio,
        fechaTermino,
        tarjetaEntregada: tarjetaEntregada || false,
        horarios: horarios || null,
        horarioConfirmado: horarioConfirmado || false,
        usuarioId,
        ...(negocioId ? { negocioId: parseInt(negocioId) } : {}),
      },
      include: includeBase
    });

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

    const { activo, urlRecurso, usuarioId: usuarioIdBody, negocioId, municipio, estatus, tarjetaEntregada, horarios, horarioConfirmado, ...dataActualizar } = req.body;

    const fechaInicio = dataActualizar.fechaInicio ? new Date(dataActualizar.fechaInicio).toISOString() : null;
    const fechaTermino = dataActualizar.fechaTermino ? new Date(dataActualizar.fechaTermino).toISOString() : null;

    delete dataActualizar.fechaInicio;
    delete dataActualizar.fechaTermino;

    const joven = await prisma.jovenJcf.update({
      where: { id },
      data: {
        ...dataActualizar,
        estatus: estatus !== undefined ? estatus : existente.estatus,
        fechaInicio: dataActualizar.hasOwnProperty('fechaInicio') ? fechaInicio : existente.fechaInicio,
        fechaTermino: dataActualizar.hasOwnProperty('fechaTermino') ? fechaTermino : existente.fechaTermino,
        tarjetaEntregada: tarjetaEntregada !== undefined ? tarjetaEntregada : existente.tarjetaEntregada,
        horarios: horarios !== undefined ? horarios : existente.horarios,
        horarioConfirmado: horarioConfirmado !== undefined ? horarioConfirmado : existente.horarioConfirmado,
        ...(negocioId !== undefined ? { negocioId: negocioId ? parseInt(negocioId) : null } : {}),
      },
      include: includeBase
    });

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