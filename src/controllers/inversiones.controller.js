const { prisma } = require('../config/database');

const generarReferencia = () => {
  const timestamp = Date.now().toString().slice(-10);
  const random = Math.floor(Math.random() * 9999999).toString().padStart(7, '0');
  return `INV${timestamp}${random}`.slice(0, 20);
};

const includeBase = {
  campana: {
    select: {
      id: true, titulo: true, metaRecaudacion: true, montoRecaudado: true,
      estado: true, tipoCrowdfunding: true,
      negocio: {
        select: {
          id: true, nombreNegocio: true, usuarioId: true,
          usuario: { select: { id: true, nombre: true, apellido: true, email: true, telefono: true } },
        },
      },
    },
  },
  inversor:    { select: { id: true, nombre: true, apellido: true, email: true, telefono: true } },
  confirmador: { select: { id: true, nombre: true, apellido: true } },
};

const adjuntarDetallesContacto = (inv) => {
  const nuevaInv = { ...inv };
  if (nuevaInv.estadoPago === 'confirmado' && nuevaInv.campana?.tipoCrowdfunding === 'inversion') {
    nuevaInv.infoContacto = {
      telefonoDueno: nuevaInv.campana.negocio?.usuario?.telefono || 'No disponible',
      emailDueno: nuevaInv.campana.negocio?.usuario?.email || 'No disponible',
      mensaje: "Comuníquese con el gerente de CAPYME y el dueño de la campaña. Tiene que ser a los dos para que estén atentos. Es su responsabilidad avisar a ambos."
    };
  }
  return nuevaInv;
};

const crearInversion = async (req, res) => {
  try {
    const { campanaId, monto, notas, inversorId: inversorIdBody, estadoPago, mercadoPagoId } = req.body;
    if (!campanaId || !monto)
      return res.status(400).json({ success: false, message: 'campanaId y monto son requeridos' });

    const montoNum = parseFloat(monto);
    if (isNaN(montoNum) || montoNum <= 0)
      return res.status(400).json({ success: false, message: 'El monto debe ser un número positivo' });

    const inversorId =
      ['admin', 'colaborador'].includes(req.user.rol) && inversorIdBody
        ? parseInt(inversorIdBody)
        : req.user.id;

    const estadoP = estadoPago === 'confirmado' ? 'confirmado' : 'pendiente';

    const inversion = await prisma.$transaction(async (tx) => {
      const campana = await tx.campana.findUnique({ where: { id: parseInt(campanaId) } });
      if (!campana) { const e = new Error('Campaña no encontrada'); e.statusCode = 404; throw e; }
      if (!campana.activo) { const e = new Error('Esta campaña no está activa'); e.statusCode = 400; throw e; }
      if (!['aprobada', 'activa'].includes(campana.estado)) {
        const e = new Error('Solo se puede invertir en campañas aprobadas o activas'); e.statusCode = 400; throw e;
      }
      
      const restante = parseFloat(campana.metaRecaudacion) - parseFloat(campana.montoRecaudado || 0);
      if (restante <= 0) { const e = new Error('Esta campaña ya alcanzó su meta'); e.statusCode = 400; throw e; }
      if (montoNum > restante) {
        const e = new Error(`Máximo permitido: $${restante.toLocaleString('es-MX')} MXN`); e.statusCode = 400; throw e;
      }

      const inv = await tx.inversion.create({
        data: {
          campanaId: parseInt(campanaId), inversorId, monto: montoNum,
          referencia: generarReferencia(), tipoPago: 'electronico',
          notas: notas || null, estadoPago: estadoP,
          mercadoPagoId: mercadoPagoId || null,
          fechaConfirmacion: estadoP === 'confirmado' ? new Date() : null,
          confirmadoPor: estadoP === 'confirmado' ? req.user.id : null
        },
        include: includeBase,
      });

      if (estadoP === 'confirmado') {
        await tx.campana.update({
          where: { id: parseInt(campanaId) },
          data: { montoRecaudado: { increment: montoNum } }
        });
        const nuevoTotal = parseFloat(campana.montoRecaudado || 0) + montoNum;
        if (nuevoTotal >= parseFloat(campana.metaRecaudacion)) {
          await tx.campana.update({ where: { id: parseInt(campanaId) }, data: { estado: 'completada' } });
        }
      }

      return inv;
    });

    res.status(201).json({ success: true, message: 'Inversión procesada.', data: adjuntarDetallesContacto(inversion), referencia: inversion.referencia });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ success: false, message: error.message });
    res.status(500).json({ success: false, message: 'Error al crear inversión', error: error.message });
  }
};

const confirmarPorReferencia = async (req, res) => {
  try {
    const { referencia } = req.body;
    if (!referencia) return res.status(400).json({ success: false, message: 'Referencia requerida' });

    const inversion = await prisma.inversion.findUnique({
      where: { referencia: String(referencia) },
      include: {
        campana:  { select: { id: true, titulo: true, metaRecaudacion: true, montoRecaudado: true, tipoCrowdfunding: true } },
        inversor: { select: { id: true } },
      },
    });

    if (!inversion) return res.json({ success: true, message: 'Inversión no encontrada', yaConfirmado: false });
    if (inversion.estadoPago === 'confirmado') return res.json({ success: true, message: 'Ya confirmado', yaConfirmado: true });

    await prisma.$transaction(async (tx) => {
      await tx.inversion.update({
        where: { id: inversion.id },
        data: { estadoPago: 'confirmado', confirmadoPor: req.user?.id || null, fechaConfirmacion: new Date() },
      });
      await tx.campana.update({
        where: { id: inversion.campanaId },
        data:  { montoRecaudado: { increment: parseFloat(inversion.monto) } },
      });
      const nuevoTotal = parseFloat(inversion.campana.montoRecaudado || 0) + parseFloat(inversion.monto);
      if (nuevoTotal >= parseFloat(inversion.campana.metaRecaudacion)) {
        await tx.campana.update({ where: { id: inversion.campanaId }, data: { estado: 'completada' } });
      }
    });

    const esInversionReal = inversion.campana.tipoCrowdfunding === 'inversion';
    let mensajeNotif = esInversionReal 
      ? `Tu inversión de $${parseFloat(inversion.monto).toLocaleString('es-MX')} MXN en "${inversion.campana.titulo}" fue confirmada. Comuníquese con el gerente de CAPYME y el dueño de la campaña.`
      : `Tu aportación de $${parseFloat(inversion.monto).toLocaleString('es-MX')} MXN en "${inversion.campana.titulo}" fue confirmada.`;

    await prisma.notificacion.create({
      data: {
        usuarioId: inversion.inversor.id, tipo: 'inversion_confirmada', titulo: 'Aportación confirmada',
        mensaje: mensajeNotif,
        leida: false,
      },
    });

    res.json({ success: true, message: 'Aportación confirmada exitosamente', yaConfirmado: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al confirmar aportación', error: error.message });
  }
};

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
        { inversor: { email:    { contains: buscar } } },
        { campana:  { titulo:   { contains: buscar } } },
      ];
    }
    if (req.user.rol === 'cliente') where.inversorId = req.user.id;

    const inversiones = await prisma.inversion.findMany({ where, include: includeBase, orderBy: { fechaCreacion: 'desc' } });
    
    const dataEnriquecida = inversiones.map(adjuntarDetallesContacto);
    res.json({ success: true, data: dataEnriquecida });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener aportaciones', error: error.message });
  }
};

const obtenerInversionesPorCampana = async (req, res) => {
  try {
    const campanaId = parseInt(req.params.campanaId);

    const campana = await prisma.campana.findUnique({
      where:  { id: campanaId },
      select: { activo: true, estado: true, negocio: { select: { usuarioId: true } } },
    });
    if (!campana) return res.status(404).json({ success: false, message: 'Campaña no encontrada' });

    const esStaff  = ['admin', 'colaborador'].includes(req.user.rol);
    const esDueno  = campana.negocio.usuarioId === req.user.id;
    const esPublica = campana.activo && ['aprobada', 'activa', 'completada'].includes(campana.estado);

    if (!esStaff && !esDueno && !esPublica) {
      return res.status(403).json({ success: false, message: 'No tienes permiso para ver estas aportaciones' });
    }

    const where = { campanaId };
    if (!esStaff && !esDueno) {
      where.estadoPago = 'confirmado';
      where.activo     = true;
    }

    const inversiones = await prisma.inversion.findMany({ where, include: includeBase, orderBy: { fechaCreacion: 'desc' } });
    const dataEnriquecida = inversiones.map(adjuntarDetallesContacto);
    res.json({ success: true, data: dataEnriquecida });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener aportaciones de la campaña', error: error.message });
  }
};

const obtenerInversionPorId = async (req, res) => {
  try {
    const inversion = await prisma.inversion.findUnique({ where: { id: parseInt(req.params.id) }, include: includeBase });
    if (!inversion) return res.status(404).json({ success: false, message: 'Aportación no encontrada' });
    if (req.user.rol === 'cliente' && inversion.inversorId !== req.user.id)
      return res.status(403).json({ success: false, message: 'No tienes permiso para ver esta aportación' });
      
    res.json({ success: true, data: adjuntarDetallesContacto(inversion) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener aportación', error: error.message });
  }
};

const actualizarInversion = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existente = await prisma.inversion.findUnique({ where: { id } });
    if (!existente) return res.status(404).json({ success: false, message: 'Aportación no encontrada' });
    if (req.user.rol === 'cliente' && existente.inversorId !== req.user.id)
      return res.status(403).json({ success: false, message: 'No tienes permiso para editar esta aportación' });

    const { notas, comprobante } = req.body;
    const dataActualizar = {};
    if (notas !== undefined) dataActualizar.notas = notas;
    if (comprobante !== undefined) dataActualizar.comprobante = comprobante || null;

    const inversion = await prisma.inversion.update({ where: { id }, data: dataActualizar, include: includeBase });
    res.json({ success: true, message: 'Aportación actualizada exitosamente', data: adjuntarDetallesContacto(inversion) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al actualizar aportación', error: error.message });
  }
};

const confirmarInversion = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existente = await prisma.inversion.findUnique({
      where: { id },
      include: { campana: true, inversor: { select: { id: true } } },
    });
    if (!existente) return res.status(404).json({ success: false, message: 'Aportación no encontrada' });
    if (existente.estadoPago === 'confirmado')
      return res.status(400).json({ success: false, message: 'Esta aportación ya fue confirmada' });

    const inversion = await prisma.$transaction(async (tx) => {
      const inv = await tx.inversion.update({
        where: { id },
        data: { estadoPago: 'confirmado', confirmadoPor: req.user.id, fechaConfirmacion: new Date() },
        include: includeBase,
      });
      await tx.campana.update({ where: { id: existente.campanaId }, data: { montoRecaudado: { increment: parseFloat(existente.monto) } } });
      const nuevoTotal = parseFloat(existente.campana.montoRecaudado || 0) + parseFloat(existente.monto);
      if (nuevoTotal >= parseFloat(existente.campana.metaRecaudacion)) {
        await tx.campana.update({ where: { id: existente.campanaId }, data: { estado: 'completada' } });
      }
      return inv;
    });

    const esInversionReal = inversion.campana.tipoCrowdfunding === 'inversion';
    let mensajeNotif = esInversionReal 
      ? `Tu inversión de $${parseFloat(inversion.monto).toLocaleString('es-MX')} MXN en "${inversion.campana.titulo}" fue confirmada. Comuníquese con el gerente de CAPYME y el dueño de la campaña.`
      : `Tu aportación de $${parseFloat(inversion.monto).toLocaleString('es-MX')} MXN en "${inversion.campana.titulo}" fue confirmada.`;

    await prisma.notificacion.create({
      data: {
        usuarioId: existente.inversor.id, tipo: 'inversion_confirmada', titulo: 'Aportación confirmada',
        mensaje: mensajeNotif,
        leida: false,
      },
    });
    
    res.json({ success: true, message: 'Aportación confirmada exitosamente', data: adjuntarDetallesContacto(inversion) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al confirmar aportación', error: error.message });
  }
};

const rechazarInversion = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existente = await prisma.inversion.findUnique({ where: { id }, include: { campana: true, inversor: { select: { id: true } } } });
    if (!existente) return res.status(404).json({ success: false, message: 'Aportación no encontrada' });
    if (existente.estadoPago !== 'pendiente')
      return res.status(400).json({ success: false, message: 'Solo se pueden rechazar aportaciones pendientes' });

    const inversion = await prisma.inversion.update({ where: { id }, data: { estadoPago: 'rechazado' }, include: includeBase });
    await prisma.notificacion.create({
      data: {
        usuarioId: existente.inversor.id, tipo: 'inversion_rechazada', titulo: 'Aportación rechazada',
        mensaje: `Tu aportación de $${parseFloat(existente.monto).toLocaleString('es-MX')} MXN en "${existente.campana.titulo}" fue rechazada.`,
        leida: false,
      },
    });
    res.json({ success: true, message: 'Aportación rechazada', data: inversion });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al rechazar aportación', error: error.message });
  }
};

const toggleActivoInversion = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existente = await prisma.inversion.findUnique({ where: { id } });
    if (!existente) return res.status(404).json({ success: false, message: 'Aportación no encontrada' });

    const nuevoActivo = !existente.activo;
    const inversion = await prisma.$transaction(async (tx) => {
      if (!nuevoActivo && existente.estadoPago === 'confirmado') {
        await tx.campana.update({ where: { id: existente.campanaId }, data: { montoRecaudado: { decrement: parseFloat(existente.monto) } } });
      } else if (nuevoActivo && existente.estadoPago === 'confirmado') {
        await tx.campana.update({ where: { id: existente.campanaId }, data: { montoRecaudado: { increment: parseFloat(existente.monto) } } });
      }
      return tx.inversion.update({ where: { id }, data: { activo: nuevoActivo }, include: includeBase });
    });

    res.json({ success: true, message: `Aportación ${nuevoActivo ? 'activada' : 'anulada'} exitosamente`, data: adjuntarDetallesContacto(inversion) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al cambiar estado', error: error.message });
  }
};

const obtenerPendientes = async (req, res) => {
  try {
    const pendientes = await prisma.inversion.findMany({
      where: { estadoPago: 'pendiente', activo: true }, include: includeBase, orderBy: { fechaCreacion: 'asc' },
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
      include: includeBase,
      orderBy: { fechaCreacion: 'desc' },
    });
    
    const dataEnriquecida = inversiones.map(adjuntarDetallesContacto);
    res.json({ success: true, data: dataEnriquecida });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener mis aportaciones', error: error.message });
  }
};

module.exports = {
  obtenerInversiones, obtenerInversionesPorCampana, obtenerInversionPorId,
  crearInversion, confirmarPorReferencia, actualizarInversion,
  confirmarInversion, rechazarInversion, toggleActivoInversion,
  obtenerPendientes, obtenerMisInversiones
};