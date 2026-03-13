/**
 * inversiones.controller.js
 *
 * crearInversion usa prisma.$transaction para garantizar atomicidad:
 *  1. Verifica que la campaña esté activa y en estado correcto
 *  2. Verifica que el monto no supere el dinero restante (meta - recaudado)
 *  3. Crea el registro de inversión
 *  4. Actualiza montoRecaudado en la campaña
 *
 * Si cualquier paso falla → rollback automático. Cero descuadres.
 */

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
      tipoCrowdfunding: true,
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
  inversor:    { select: { id: true, nombre: true, apellido: true, email: true, telefono: true } },
  confirmador: { select: { id: true, nombre: true, apellido: true } },
};

// ─── POST /inversiones ────────────────────────────────────────────────────────
const crearInversion = async (req, res) => {
  try {
    const { campanaId, monto, notas, inversorId: inversorIdBody } = req.body;

    if (!campanaId || !monto) {
      return res.status(400).json({ success: false, message: 'campanaId y monto son requeridos' });
    }

    const montoNum = parseFloat(monto);
    if (isNaN(montoNum) || montoNum <= 0) {
      return res.status(400).json({ success: false, message: 'El monto debe ser un número positivo' });
    }

    const inversorId =
      ['admin', 'colaborador'].includes(req.user.rol) && inversorIdBody
        ? parseInt(inversorIdBody)
        : req.user.id;

    // ── $transaction: todas las operaciones o ninguna ─────────────────────
    const inversion = await prisma.$transaction(async (tx) => {

      // 1. Leer campaña con bloqueo de lectura consistente dentro de la tx
      const campana = await tx.campana.findUnique({
        where: { id: parseInt(campanaId) },
      });

      if (!campana) {
        const e = new Error('Campaña no encontrada');
        e.statusCode = 404;
        throw e;
      }

      if (!campana.activo) {
        const e = new Error('Esta campaña no está activa');
        e.statusCode = 400;
        throw e;
      }

      const estadosPermitidos = ['aprobada', 'activa'];
      if (!estadosPermitidos.includes(campana.estado)) {
        const e = new Error('Solo se puede invertir en campañas aprobadas o activas');
        e.statusCode = 400;
        throw e;
      }

      // 2. Verificar que el monto no supere lo que falta para la meta
      const metaNum        = parseFloat(campana.metaRecaudacion);
      const recaudadoNum   = parseFloat(campana.montoRecaudado || 0);
      const restante       = metaNum - recaudadoNum;

      if (restante <= 0) {
        const e = new Error('Esta campaña ya alcanzó su meta de recaudación');
        e.statusCode = 400;
        throw e;
      }

      if (montoNum > restante) {
        const e = new Error(
          `El monto supera lo que falta para completar la meta. Máximo permitido: $${restante.toLocaleString('es-MX')} MXN`
        );
        e.statusCode = 400;
        throw e;
      }

      // 3. Crear el registro de inversión
      //    estadoPago = 'confirmado' (flujo simulado actual).
      //    TODO Mercado Pago: cambiar a 'pendiente' y guardar mercadoPagoId + urlPago
      //    cuando se reciba la respuesta del checkout de MP.
      const referencia = generarReferencia();

      const nuevaInversion = await tx.inversion.create({
        data: {
          campanaId:         parseInt(campanaId),
          inversorId,
          monto:             montoNum,
          referencia,
          tipoPago:          'electronico',
          notas:             notas || null,
          estadoPago:        'confirmado',
          confirmadoPor:     req.user.id,
          fechaConfirmacion: new Date(),
          // Campos para Mercado Pago (quedan null hasta integración):
          // mercadoPagoId: null,
          // urlPago: null,
        },
        include: includeBase,
      });

      // 4. Actualizar montoRecaudado de la campaña de forma atómica
      const campanaActualizada = await tx.campana.update({
        where: { id: parseInt(campanaId) },
        data:  { montoRecaudado: { increment: montoNum } },
      });

      // 5. Si la campaña ahora está completa, cambiar estado automáticamente
      const nuevoRecaudado = parseFloat(campanaActualizada.montoRecaudado);
      if (nuevoRecaudado >= metaNum) {
        await tx.campana.update({
          where: { id: parseInt(campanaId) },
          data:  { estado: 'completada' },
        });
      }

      return nuevaInversion;
    }); // fin $transaction — si algo lanzó error, Prisma hace rollback automático

    // ── Notificaciones (fuera de la tx, no son críticas) ─────────────────
    const admins = await prisma.usuario.findMany({
      where: { rol: 'admin', activo: true },
      select: { id: true },
    });

    const nombreInversor = `${inversion.inversor.nombre} ${inversion.inversor.apellido}`;

    if (admins.length > 0) {
      await prisma.notificacion.createMany({
        data: admins.map((a) => ({
          usuarioId: a.id,
          tipo:      'nueva_inversion',
          titulo:    'Nueva inversión registrada',
          mensaje:   `${nombreInversor} invirtió $${montoNum.toLocaleString('es-MX')} MXN en la campaña "${inversion.campana.titulo}".`,
          leida:     false,
        })),
      });
    }

    await registrarHistorial(
      req.user.id,
      'CREATE',
      inversion.id,
      `Inversión creada: ${inversion.referencia} — $${montoNum} en "${inversion.campana.titulo}"`,
      req.ip
    );

    res.status(201).json({
      success: true,
      message: 'Inversión registrada exitosamente',
      data: inversion,
    });

  } catch (error) {
    // Si el error tiene statusCode (lanzado dentro de la tx) → respuesta limpia
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: 'Error al crear inversión', error: error.message });
  }
};

// ─── El resto de los handlers permanece igual que antes ───────────────────────

const obtenerInversiones = async (req, res) => {
  try {
    const { campanaId, estadoPago, activo, buscar } = req.query;
    const where = {};
    if (campanaId)  where.campanaId  = parseInt(campanaId);
    if (estadoPago) where.estadoPago = estadoPago;
    if (activo !== undefined) where.activo = activo === 'true';
    if (buscar) {
      where.OR = [
        { referencia: { contains: buscar } },
        { inversor: { nombre:   { contains: buscar } } },
        { inversor: { apellido: { contains: buscar } } },
        { campana:  { titulo:   { contains: buscar } } },
      ];
    }
    if (req.user.rol === 'cliente') where.inversorId = req.user.id;

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
    if (notas !== undefined)       dataActualizar.notas      = notas;
    if (comprobante !== undefined) dataActualizar.comprobante = comprobante || null;

    const inversion = await prisma.inversion.update({
      where: { id },
      data: dataActualizar,
      include: includeBase,
    });
    await registrarHistorial(req.user.id, 'UPDATE', inversion.id, `Inversión actualizada: ${inversion.referencia}`, req.ip);
    res.json({ success: true, message: 'Inversión actualizada exitosamente', data: inversion });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al actualizar inversión', error: error.message });
  }
};

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

    const inversion = await prisma.$transaction(async (tx) => {
      const inv = await tx.inversion.update({
        where: { id },
        data: { estadoPago: 'confirmado', confirmadoPor: req.user.id, fechaConfirmacion: new Date() },
        include: includeBase,
      });
      await tx.campana.update({
        where: { id: existente.campanaId },
        data:  { montoRecaudado: { increment: parseFloat(existente.monto) } },
      });
      return inv;
    });

    await prisma.notificacion.create({
      data: {
        usuarioId: existente.inversor.id,
        tipo:      'inversion_confirmada',
        titulo:    'Inversión confirmada',
        mensaje:   `Tu inversión de $${parseFloat(existente.monto).toLocaleString('es-MX')} MXN en "${existente.campana.titulo}" fue confirmada.`,
        leida:     false,
      },
    });
    await registrarHistorial(req.user.id, 'CONFIRMAR', inversion.id, `Inversión confirmada: ${inversion.referencia}`, req.ip);
    res.json({ success: true, message: 'Inversión confirmada exitosamente', data: inversion });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al confirmar inversión', error: error.message });
  }
};

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
        tipo:      'inversion_rechazada',
        titulo:    'Inversión rechazada',
        mensaje:   `Tu inversión de $${parseFloat(existente.monto).toLocaleString('es-MX')} MXN en "${existente.campana.titulo}" fue rechazada.`,
        leida:     false,
      },
    });
    await registrarHistorial(req.user.id, 'RECHAZAR', inversion.id, `Inversión rechazada: ${inversion.referencia}`, req.ip);
    res.json({ success: true, message: 'Inversión rechazada', data: inversion });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al rechazar inversión', error: error.message });
  }
};

const toggleActivoInversion = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existente = await prisma.inversion.findUnique({ where: { id } });
    if (!existente) return res.status(404).json({ success: false, message: 'Inversión no encontrada' });

    const nuevoActivo = !existente.activo;

    const inversion = await prisma.$transaction(async (tx) => {
      // Si se anula una inversión confirmada → descontar del recaudado
      if (!nuevoActivo && existente.estadoPago === 'confirmado') {
        await tx.campana.update({
          where: { id: existente.campanaId },
          data:  { montoRecaudado: { decrement: parseFloat(existente.monto) } },
        });
      }
      return tx.inversion.update({
        where: { id },
        data:  { activo: nuevoActivo },
        include: includeBase,
      });
    });

    await registrarHistorial(req.user.id, 'TOGGLE_ACTIVO', inversion.id,
      `Inversión ${nuevoActivo ? 'activada' : 'anulada'}: ${inversion.referencia}`, req.ip);

    res.json({ success: true, message: `Inversión ${nuevoActivo ? 'activada' : 'anulada'} exitosamente`, data: inversion });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al cambiar estado', error: error.message });
  }
};

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

const obtenerMisInversiones = async (req, res) => {
  try {
    const { estadoPago, activo } = req.query;
    const where = { inversorId: req.user.id };
    if (estadoPago) where.estadoPago = estadoPago;
    if (activo !== undefined) where.activo = activo === 'true';

    const inversiones = await prisma.inversion.findMany({
      where,
      include: {
        campana: {
          select: {
            id: true, titulo: true, estado: true,
            metaRecaudacion: true, montoRecaudado: true,
            tipoCrowdfunding: true, recompensaDesc: true,
            interesPct: true, plazoRetornoDias: true, imagenUrl: true,
            negocio: { select: { id: true, nombreNegocio: true } },
          },
        },
        confirmador: { select: { id: true, nombre: true, apellido: true } },
      },
      orderBy: { fechaCreacion: 'desc' },
    });

    res.json({ success: true, data: inversiones });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener mis inversiones', error: error.message });
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
  obtenerMisInversiones,
};