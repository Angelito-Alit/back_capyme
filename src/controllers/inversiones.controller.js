const { prisma } = require('../config/database');

const registrarHistorial = async (usuarioId, accion, registroId, descripcion, ip) => {
  try {
    await prisma.historialAccion.create({
      data: { usuarioId, accion, tablaAfectada: 'inversiones', registroId, descripcion, ipAddress: ip || null },
    });
  } catch {}
};

const generarReferencia = () => {
  const timestamp = Date.now().toString().slice(-10);
  const random = Math.floor(Math.random() * 9999999).toString().padStart(7, '0');
  return `INV${timestamp}${random}`.slice(0, 20);
};

const includeBase = {
  campana: {
    select: {
      id: true,
      titulo: true,
      metaRecaudacion: true,
      montoRecaudado: true,
      estado: true,
      negocio: {
        select: {
          id: true,
          nombreNegocio: true,
          usuarioId: true,
          usuario: { select: { id: true, nombre: true, apellido: true } },
        },
      },
    },
  },
  inversor: {
    select: { id: true, nombre: true, apellido: true, email: true, telefono: true },
  },
  confirmador: {
    select: { id: true, nombre: true, apellido: true },
  },
};

// ─── GET /inversiones ─────────────────────────────────────────────────────────
const obtenerInversiones = async (req, res) => {
  try {
    const { campanaId, estadoPago, activo, buscar } = req.query;

    const where = {};
    if (campanaId)   where.campanaId  = parseInt(campanaId);
    if (estadoPago)  where.estadoPago = estadoPago;
    if (activo !== undefined) where.activo = activo === 'true';
    if (buscar) {
      where.OR = [
        { referencia: { contains: buscar } },
        { inversor: { nombre: { contains: buscar } } },
        { inversor: { apellido: { contains: buscar } } },
        { campana: { titulo: { contains: buscar } } },
      ];
    }

    if (req.user.rol === 'cliente') {
      where.inversorId = req.user.id;
    }

    const inversiones = await prisma.inversion.findMany({
      where,
      include: includeBase,
      orderBy: { fechaCreacion: 'desc' },
    });

    res.json({ success: true, data: inversiones });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener inversiones', error: error.message });
  }
};

// ─── GET /inversiones/campana/:campanaId — inversores de mi campaña (cliente dueño) ─
const obtenerInversionesPorCampana = async (req, res) => {
  try {
    const campanaId = parseInt(req.params.campanaId);

    const campana = await prisma.campana.findUnique({
      where: { id: campanaId },
      select: { negocio: { select: { usuarioId: true } } },
    });

    if (!campana) return res.status(404).json({ success: false, message: 'Campaña no encontrada' });

    if (req.user.rol === 'cliente' && campana.negocio.usuarioId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'No tienes permiso para ver estas inversiones' });
    }

    const inversiones = await prisma.inversion.findMany({
      where: { campanaId },
      include: includeBase,
      orderBy: { fechaCreacion: 'desc' },
    });

    res.json({ success: true, data: inversiones });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener inversiones de la campaña', error: error.message });
  }
};

// ─── GET /inversiones/:id ──────────────────────────────────────────────────────
const obtenerInversionPorId = async (req, res) => {
  try {
    const inversion = await prisma.inversion.findUnique({
      where: { id: parseInt(req.params.id) },
      include: includeBase,
    });

    if (!inversion) return res.status(404).json({ success: false, message: 'Inversión no encontrada' });

    if (req.user.rol === 'cliente' && inversion.inversorId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'No tienes permiso para ver esta inversión' });
    }

    res.json({ success: true, data: inversion });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener inversión', error: error.message });
  }
};

// ─── POST /inversiones — crear inversión ──────────────────────────────────────
// Flujo actual: pago simulado → confirmado automáticamente.
// TODO: cuando se integre Mercado Pago Checkout Pro, este endpoint recibirá
//       el payment_id de MP y validará el webhook antes de confirmar.
const crearInversion = async (req, res) => {
  try {
    const { campanaId, monto, notas, inversorId: inversorIdBody } = req.body;

    if (!campanaId || !monto) {
      return res.status(400).json({ success: false, message: 'campanaId y monto son requeridos' });
    }

    const campana = await prisma.campana.findUnique({ where: { id: parseInt(campanaId) } });
    if (!campana) return res.status(404).json({ success: false, message: 'Campaña no encontrada' });
    if (!campana.activo) return res.status(400).json({ success: false, message: 'Esta campaña no está activa' });
    if (campana.estado !== 'aprobada' && campana.estado !== 'activa') {
      return res.status(400).json({ success: false, message: 'Solo se puede invertir en campañas aprobadas o activas' });
    }

    const inversorId = ['admin', 'colaborador'].includes(req.user.rol) && inversorIdBody
      ? parseInt(inversorIdBody)
      : req.user.id;

    const referencia = generarReferencia();

    // Todos los pagos se confirman inmediatamente (simulado).
    // Cuando se integre MP, estadoPago quedará 'pendiente' hasta recibir webhook.
    const inversion = await prisma.inversion.create({
      data: {
        campanaId: parseInt(campanaId),
        inversorId,
        monto: parseFloat(monto),
        referencia,
        tipoPago: 'electronico',
        notas: notas || null,
        estadoPago: 'confirmado',
        confirmadoPor: req.user.id,
        fechaConfirmacion: new Date(),
      },
      include: includeBase,
    });

    await prisma.campana.update({
      where: { id: parseInt(campanaId) },
      data: { montoRecaudado: { increment: parseFloat(monto) } },
    });

    const admins = await prisma.usuario.findMany({
      where: { rol: 'admin', activo: true },
      select: { id: true },
    });
    const nombreInversor = `${inversion.inversor.nombre} ${inversion.inversor.apellido}`;
    await prisma.notificacion.createMany({
      data: admins.map((a) => ({
        usuarioId: a.id,
        tipo: 'nueva_inversion',
        titulo: 'Nueva inversión registrada',
        mensaje: `${nombreInversor} invirtió $${parseFloat(monto).toLocaleString('es-MX')} MXN en la campaña "${campana.titulo}".`,
        leida: false,
      })),
    });

    await registrarHistorial(req.user.id, 'CREATE', inversion.id,
      `Inversión creada: ${referencia} — $${monto} en "${campana.titulo}"`, req.ip);

    res.status(201).json({ success: true, message: 'Inversión registrada exitosamente', data: inversion });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al crear inversión', error: error.message });
  }
};

// ─── PUT /inversiones/:id — editar notas / comprobante ────────────────────────
const actualizarInversion = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existente = await prisma.inversion.findUnique({ where: { id } });
    if (!existente) return res.status(404).json({ success: false, message: 'Inversión no encontrada' });

    if (req.user.rol === 'cliente' && existente.inversorId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'No tienes permiso para editar esta inversión' });
    }

    const { notas, comprobante } = req.body;
    const dataActualizar = {};
    if (notas !== undefined)      dataActualizar.notas      = notas;
    if (comprobante !== undefined) dataActualizar.comprobante = comprobante || null;

    const inversion = await prisma.inversion.update({
      where: { id },
      data: dataActualizar,
      include: includeBase,
    });

    await registrarHistorial(req.user.id, 'UPDATE', inversion.id,
      `Inversión actualizada: ${inversion.referencia}`, req.ip);

    res.json({ success: true, message: 'Inversión actualizada exitosamente', data: inversion });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al actualizar inversión', error: error.message });
  }
};

// ─── PATCH /inversiones/:id/confirmar ─────────────────────────────────────────
const confirmarInversion = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existente = await prisma.inversion.findUnique({
      where: { id },
      include: { campana: true, inversor: { select: { id: true, nombre: true, apellido: true } } },
    });
    if (!existente) return res.status(404).json({ success: false, message: 'Inversión no encontrada' });
    if (existente.estadoPago === 'confirmado') {
      return res.status(400).json({ success: false, message: 'Esta inversión ya fue confirmada' });
    }

    const inversion = await prisma.inversion.update({
      where: { id },
      data: {
        estadoPago: 'confirmado',
        confirmadoPor: req.user.id,
        fechaConfirmacion: new Date(),
      },
      include: includeBase,
    });

    await prisma.campana.update({
      where: { id: existente.campanaId },
      data: { montoRecaudado: { increment: parseFloat(existente.monto) } },
    });

    await prisma.notificacion.create({
      data: {
        usuarioId: existente.inversor.id,
        tipo: 'inversion_confirmada',
        titulo: 'Inversión confirmada',
        mensaje: `Tu inversión de $${parseFloat(existente.monto).toLocaleString('es-MX')} MXN en la campaña "${existente.campana.titulo}" fue confirmada. ¡Gracias por tu apoyo!`,
        leida: false,
      },
    });

    await registrarHistorial(req.user.id, 'CONFIRMAR', inversion.id,
      `Inversión confirmada: ${inversion.referencia}`, req.ip);

    res.json({ success: true, message: 'Inversión confirmada exitosamente', data: inversion });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al confirmar inversión', error: error.message });
  }
};

// ─── PATCH /inversiones/:id/rechazar ──────────────────────────────────────────
const rechazarInversion = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existente = await prisma.inversion.findUnique({
      where: { id },
      include: { campana: true, inversor: { select: { id: true, nombre: true, apellido: true } } },
    });
    if (!existente) return res.status(404).json({ success: false, message: 'Inversión no encontrada' });
    if (existente.estadoPago !== 'pendiente') {
      return res.status(400).json({ success: false, message: 'Solo se pueden rechazar inversiones pendientes' });
    }

    const inversion = await prisma.inversion.update({
      where: { id },
      data: { estadoPago: 'rechazado' },
      include: includeBase,
    });

    await prisma.notificacion.create({
      data: {
        usuarioId: existente.inversor.id,
        tipo: 'inversion_rechazada',
        titulo: 'Inversión rechazada',
        mensaje: `Tu inversión de $${parseFloat(existente.monto).toLocaleString('es-MX')} MXN en la campaña "${existente.campana.titulo}" fue rechazada. Contáctanos si tienes dudas.`,
        leida: false,
      },
    });

    await registrarHistorial(req.user.id, 'RECHAZAR', inversion.id,
      `Inversión rechazada: ${inversion.referencia}`, req.ip);

    res.json({ success: true, message: 'Inversión rechazada', data: inversion });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al rechazar inversión', error: error.message });
  }
};

// ─── PATCH /inversiones/:id/toggle-activo ─────────────────────────────────────
const toggleActivoInversion = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existente = await prisma.inversion.findUnique({ where: { id } });
    if (!existente) return res.status(404).json({ success: false, message: 'Inversión no encontrada' });

    const nuevoActivo = !existente.activo;

    if (!nuevoActivo && existente.estadoPago === 'confirmado') {
      await prisma.campana.update({
        where: { id: existente.campanaId },
        data: { montoRecaudado: { decrement: parseFloat(existente.monto) } },
      });
    }

    const inversion = await prisma.inversion.update({
      where: { id },
      data: { activo: nuevoActivo },
      include: includeBase,
    });

    await registrarHistorial(req.user.id, 'TOGGLE_ACTIVO', inversion.id,
      `Inversión ${nuevoActivo ? 'activada' : 'anulada'}: ${inversion.referencia}`, req.ip);

    res.json({
      success: true,
      message: `Inversión ${nuevoActivo ? 'activada' : 'anulada'} exitosamente`,
      data: inversion,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al cambiar estado', error: error.message });
  }
};

// ─── GET /inversiones/pendientes — solo admin ─────────────────────────────────
const obtenerPendientes = async (req, res) => {
  try {
    const pendientes = await prisma.inversion.findMany({
      where: { estadoPago: 'pendiente', activo: true },
      include: includeBase,
      orderBy: { fechaCreacion: 'asc' },
    });
    res.json({ success: true, data: pendientes });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener pendientes', error: error.message });
  }
};

module.exports = {
  obtenerInversiones,
  obtenerInversionesPorCampana,
  obtenerInversionPorId,
  crearInversion,
  actualizarInversion,
  confirmarInversion,
  rechazarInversion,
  toggleActivoInversion,
  obtenerPendientes,
};