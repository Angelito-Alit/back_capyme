const { prisma } = require('../config/database');

const includeBase = {
  usuario: { select: { id: true, nombre: true, apellido: true, email: true, telefono: true } },
  categoria: true
};

const obtenerNegocios = async (req, res) => {
  try {
    const { categoriaId, activo, buscar, usuarioId } = req.query;

    const where = {};
    if (categoriaId) where.categoriaId = parseInt(categoriaId);
    if (activo !== undefined) where.activo = activo === 'true';
    if (usuarioId) where.usuarioId = parseInt(usuarioId);
    if (buscar) {
      where.OR = [
        { nombreNegocio: { contains: buscar } },
        { rfc: { contains: buscar } }
      ];
    }
    if (req.user.rol === 'cliente') where.usuarioId = req.user.id;

    const negocios = await prisma.negocio.findMany({
      where,
      include: includeBase,
      orderBy: { fechaRegistro: 'desc' }
    });

    res.json({ success: true, data: negocios });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener negocios', error: error.message });
  }
};

const obtenerMisNegocios = async (req, res) => {
  try {
    const negocios = await prisma.negocio.findMany({
      where: { usuarioId: req.user.id },
      include: { categoria: true },
      orderBy: { fechaRegistro: 'desc' }
    });
    res.json({ success: true, data: negocios });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener mis negocios', error: error.message });
  }
};

const obtenerNegocioPorId = async (req, res) => {
  try {
    const negocio = await prisma.negocio.findUnique({
      where: { id: parseInt(req.params.id) },
      include: includeBase
    });

    if (!negocio) return res.status(404).json({ success: false, message: 'Negocio no encontrado' });
    if (req.user.rol === 'cliente' && negocio.usuarioId !== req.user.id)
      return res.status(403).json({ success: false, message: 'No tienes permiso para ver este negocio' });

    res.json({ success: true, data: negocio });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener negocio', error: error.message });
  }
};

const crearNegocio = async (req, res) => {
  try {
    const { activo, usuarioId: usuarioIdBody, categoriaId, ...rest } = req.body;

    if (!categoriaId) {
      return res.status(400).json({ success: false, message: 'La categoría es requerida' });
    }

    const usuarioId = (['admin', 'colaborador'].includes(req.user.rol)) && usuarioIdBody
      ? parseInt(usuarioIdBody)
      : req.user.id;

    const usuarioPropietario = await prisma.usuario.findUnique({ where: { id: usuarioId } });
    if (!usuarioPropietario) {
      return res.status(404).json({ success: false, message: 'El usuario propietario no existe' });
    }

    const negocio = await prisma.negocio.create({
      data: {
        ...rest,
        usuarioId,
        categoriaId: parseInt(categoriaId),
      },
      include: includeBase
    });

    res.status(201).json({ success: true, message: 'Negocio creado exitosamente', data: negocio });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al crear negocio', error: error.message });
  }
};

const actualizarNegocio = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existente = await prisma.negocio.findUnique({ where: { id } });

    if (!existente) return res.status(404).json({ success: false, message: 'Negocio no encontrado' });
    if (req.user.rol === 'cliente' && existente.usuarioId !== req.user.id)
      return res.status(403).json({ success: false, message: 'No tienes permiso para editar este negocio' });

    const { activo, usuarioId: usuarioIdBody, categoriaId, ...rest } = req.body;

    const dataActualizar = { ...rest };
    if (categoriaId) dataActualizar.categoriaId = parseInt(categoriaId);

    if (req.user.rol === 'admin' && usuarioIdBody) {
      dataActualizar.usuarioId = parseInt(usuarioIdBody);
    }

    const negocio = await prisma.negocio.update({
      where: { id },
      data: dataActualizar,
      include: includeBase
    });

    res.json({ success: true, message: 'Negocio actualizado exitosamente', data: negocio });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al actualizar negocio', error: error.message });
  }
};

const toggleActivoNegocio = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existente = await prisma.negocio.findUnique({ where: { id } });

    if (!existente) return res.status(404).json({ success: false, message: 'Negocio no encontrado' });

    const negocio = await prisma.negocio.update({
      where: { id },
      data: { activo: !existente.activo },
      include: includeBase
    });

    res.json({
      success: true,
      message: `Negocio ${negocio.activo ? 'activado' : 'desactivado'} exitosamente`,
      data: negocio
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al cambiar estado', error: error.message });
  }
};

module.exports = {
  obtenerNegocios,
  obtenerMisNegocios,
  obtenerNegocioPorId,
  crearNegocio,
  actualizarNegocio,
  toggleActivoNegocio
};