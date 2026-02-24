const { prisma } = require('../config/database');

const registrarHistorial = async (usuarioId, accion, registroId, descripcion, ip) => {
  try {
    await prisma.historialAccion.create({
      data: { usuarioId, accion, tablaAfectada: 'enlaces_recursos', registroId, descripcion, ipAddress: ip || null }
    });
  } catch {}
};

const generarReferencia = () => {
  const timestamp = Date.now().toString().slice(-10);
  const random = Math.floor(Math.random() * 99999999).toString().padStart(8, '0');
  return `REC${timestamp}${random}`.slice(0, 18);
};

const obtenerEnlaces = async (req, res) => {
  try {
    const { activo, tipo, categoria } = req.query;
    const where = {};
    if (activo !== undefined) where.activo = activo === 'true';
    if (tipo) where.tipo = tipo;
    if (categoria) where.categoria = { contains: categoria };

    if (req.user.rol === 'cliente') {
      where.visiblePara = { in: ['todos', 'clientes'] };
      where.activo = true;
    } else if (req.user.rol === 'colaborador') {
      where.visiblePara = { in: ['todos', 'colaboradores', 'admin'] };
    }

    const enlaces = await prisma.enlaceRecurso.findMany({
      where,
      include: {
        creador: { select: { id: true, nombre: true, apellido: true } },
        accesos: req.user.rol === 'cliente' ? {
          where: { usuarioId: req.user.id },
          include: { pago: { select: { estadoPago: true, referencia: true, monto: true } } }
        } : { select: { id: true } }
      },
      orderBy: { fechaCreacion: 'desc' },
    });

    const esCliente = req.user.rol === 'cliente';
    const data = enlaces.map(e => {
      const costo = e.costo ? parseFloat(e.costo) : 0;
      let miAcceso = null;
      if (esCliente && e.accesos?.length > 0) {
        const acc = e.accesos[0];
        miAcceso = {
          estado: acc.estado,
          pago: acc.pago || null,
        };
      }
      return {
        ...e,
        costo,
        accesos: undefined,
        miAcceso,
        accesosCount: esCliente ? undefined : (e.accesos?.length || 0),
      };
    });

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener catálogos', error: error.message });
  }
};

const obtenerEnlacePorId = async (req, res) => {
  try {
    const enlace = await prisma.enlaceRecurso.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { creador: { select: { id: true, nombre: true, apellido: true } } },
    });
    if (!enlace) return res.status(404).json({ success: false, message: 'Catálogo no encontrado' });
    res.json({ success: true, data: enlace });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener catálogo', error: error.message });
  }
};

const crearEnlace = async (req, res) => {
  try {
    const { creadoPor, activo, ...data } = req.body;
    const costo = data.costo ? parseFloat(data.costo) : 0;
    if (costo > 0) {
      const creador = await prisma.usuario.findUnique({
        where: { id: req.user.id },
        select: { clabeInterbancaria: true },
      });
      if (!creador?.clabeInterbancaria) {
        return res.status(400).json({
          success: false,
          message: 'Debes configurar tu CLABE interbancaria en tu perfil antes de crear un recurso con costo.',
        });
      }
    }
    const enlace = await prisma.enlaceRecurso.create({
      data: { ...data, creadoPor: req.user.id },
      include: { creador: { select: { id: true, nombre: true, apellido: true } } },
    });
    await registrarHistorial(req.user.id, 'CREATE', enlace.id, `Catálogo creado: "${enlace.titulo}"`, req.ip);
    res.status(201).json({ success: true, message: 'Catálogo creado exitosamente', data: enlace });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al crear catálogo', error: error.message });
  }
};

const actualizarEnlace = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existente = await prisma.enlaceRecurso.findUnique({ where: { id } });
    if (!existente) return res.status(404).json({ success: false, message: 'Catálogo no encontrado' });
    const { creadoPor, activo, ...data } = req.body;
    const costo = data.costo ? parseFloat(data.costo) : 0;
    if (costo > 0) {
      const creador = await prisma.usuario.findUnique({
        where: { id: req.user.id },
        select: { clabeInterbancaria: true },
      });
      if (!creador?.clabeInterbancaria) {
        return res.status(400).json({
          success: false,
          message: 'Debes configurar tu CLABE interbancaria antes de asignar un costo al recurso.',
        });
      }
    }
    const enlace = await prisma.enlaceRecurso.update({
      where: { id },
      data,
      include: { creador: { select: { id: true, nombre: true, apellido: true } } },
    });
    await registrarHistorial(req.user.id, 'UPDATE', enlace.id, `Catálogo actualizado: "${enlace.titulo}"`, req.ip);
    res.json({ success: true, message: 'Catálogo actualizado exitosamente', data: enlace });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al actualizar catálogo', error: error.message });
  }
};

const toggleActivoEnlace = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existente = await prisma.enlaceRecurso.findUnique({ where: { id } });
    if (!existente) return res.status(404).json({ success: false, message: 'Catálogo no encontrado' });
    const enlace = await prisma.enlaceRecurso.update({
      where: { id },
      data: { activo: !existente.activo },
      include: { creador: { select: { id: true, nombre: true, apellido: true } } },
    });
    const accionTexto = enlace.activo ? 'activado' : 'desactivado';
    await registrarHistorial(req.user.id, 'TOGGLE_ACTIVO', enlace.id, `Catálogo ${accionTexto}: "${enlace.titulo}"`, req.ip);
    res.json({ success: true, message: `Catálogo ${accionTexto} exitosamente`, data: enlace });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al cambiar estado', error: error.message });
  }
};

const solicitarAcceso = async (req, res) => {
  try {
    const enlaceId = parseInt(req.params.id);
    const enlace = await prisma.enlaceRecurso.findUnique({
      where: { id: enlaceId },
      include: {
        accesos: {
          include: { pago: { select: { estadoPago: true, referencia: true, monto: true } } }
        }
      }
    });
    if (!enlace) return res.status(404).json({ success: false, message: 'Catálogo no encontrado' });
    if (!enlace.activo) return res.status(400).json({ success: false, message: 'Este catálogo no está disponible' });

    const accesoExistente = await prisma.accesoRecurso.findUnique({
      where: { unique_usuario_enlace: { usuarioId: req.user.id, enlaceId } },
      include: { pago: true }
    });

    if (accesoExistente) {
      if (accesoExistente.estado === 'activo') {
        return res.status(400).json({ success: false, message: 'Ya tienes acceso a este recurso' });
      }
      if (accesoExistente.pago?.estadoPago === 'pendiente') {
        const admin = await prisma.usuario.findFirst({
          where: { rol: 'admin', activo: true },
          select: { clabeInterbancaria: true, whatsappPagos: true },
          orderBy: { id: 'asc' },
        });
        return res.status(400).json({
          success: false,
          message: 'Ya tienes un pago pendiente para este recurso',
          pagoExistente: {
            referencia: accesoExistente.pago.referencia,
            monto: accesoExistente.pago.monto,
            tituloRecurso: enlace.titulo,
            clabeInterbancaria: admin?.clabeInterbancaria || null,
            whatsappPagos: admin?.whatsappPagos || null,
          },
        });
      }
    }

    const costo = enlace.costo ? parseFloat(enlace.costo) : 0;
    const requierePago = costo > 0;

    const acceso = await prisma.accesoRecurso.create({
      data: {
        enlaceId,
        usuarioId: req.user.id,
        estado: requierePago ? 'pendiente' : 'activo',
      },
      include: {
        enlace: { select: { id: true, titulo: true, costo: true } },
        usuario: { select: { id: true, nombre: true, apellido: true, email: true } },
      }
    });

    let pagoInfo = null;
    if (requierePago) {
      const referencia = generarReferencia();
      const admin = await prisma.usuario.findFirst({
        where: { rol: 'admin', activo: true },
        select: { clabeInterbancaria: true, whatsappPagos: true },
        orderBy: { id: 'asc' },
      });
      await prisma.pagoAccesoRecurso.create({
        data: { accesoId: acceso.id, referencia, monto: costo, tipoPago: 'spei', estadoPago: 'pendiente' }
      });
      pagoInfo = {
        referencia,
        monto: costo,
        clabeInterbancaria: admin?.clabeInterbancaria || null,
        whatsappPagos: admin?.whatsappPagos || null,
        tituloRecurso: enlace.titulo,
      };
    }

    const admins = await prisma.usuario.findMany({
      where: { rol: 'admin', activo: true },
      select: { id: true },
    });
    const nombreCliente = `${acceso.usuario.nombre} ${acceso.usuario.apellido}`;
    const mensajeAdmin = requierePago
      ? `${nombreCliente} solicitó acceso al recurso "${enlace.titulo}" y está pendiente de pago (${new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(costo)}).`
      : `${nombreCliente} accedió al recurso gratuito "${enlace.titulo}".`;

    await prisma.notificacion.createMany({
      data: admins.map(admin => ({
        usuarioId: admin.id,
        tipo: requierePago ? 'acceso_pendiente_pago' : 'nuevo_acceso_recurso',
        titulo: requierePago ? 'Nueva solicitud de acceso a recurso' : 'Nuevo acceso a recurso',
        mensaje: mensajeAdmin,
        leida: false,
      })),
    });

    res.status(201).json({
      success: true,
      message: requierePago ? 'Solicitud registrada. Realiza tu pago para obtener acceso.' : 'Acceso otorgado exitosamente',
      data: acceso,
      requierePago,
      pagoInfo,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al solicitar acceso', error: error.message });
  }
};

const obtenerMiPago = async (req, res) => {
  try {
    const enlaceId = parseInt(req.params.id);
    const acceso = await prisma.accesoRecurso.findUnique({
      where: { unique_usuario_enlace: { usuarioId: req.user.id, enlaceId } },
      include: {
        pago: true,
        enlace: { select: { id: true, titulo: true, costo: true } },
      },
    });
    if (!acceso) return res.status(404).json({ success: false, message: 'No tienes solicitud para este recurso' });
    if (!acceso.pago) return res.json({ success: true, data: { tienePago: false } });
    const admin = await prisma.usuario.findFirst({
      where: { rol: 'admin', activo: true },
      select: { clabeInterbancaria: true, whatsappPagos: true },
      orderBy: { id: 'asc' },
    });
    res.json({
      success: true,
      data: {
        tienePago: true,
        referencia: acceso.pago.referencia,
        monto: acceso.pago.monto,
        estadoPago: acceso.pago.estadoPago,
        tituloRecurso: acceso.enlace.titulo,
        clabeInterbancaria: admin?.clabeInterbancaria || null,
        whatsappPagos: admin?.whatsappPagos || null,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener pago', error: error.message });
  }
};

const obtenerPagosPendientes = async (req, res) => {
  try {
    const pagos = await prisma.pagoAccesoRecurso.findMany({
      where: { estadoPago: 'pendiente' },
      include: {
        acceso: {
          include: {
            usuario: { select: { id: true, nombre: true, apellido: true, email: true, telefono: true } },
            enlace: { select: { id: true, titulo: true, costo: true } },
          },
        },
      },
      orderBy: { fechaCreacion: 'desc' },
    });
    res.json({ success: true, data: pagos });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener pagos pendientes', error: error.message });
  }
};

const confirmarPago = async (req, res) => {
  try {
    const id = parseInt(req.params.pagoId);
    const pago = await prisma.pagoAccesoRecurso.findUnique({ where: { id } });
    if (!pago) return res.status(404).json({ success: false, message: 'Pago no encontrado' });
    if (pago.estadoPago === 'confirmado') return res.status(400).json({ success: false, message: 'Este pago ya fue confirmado' });

    const pagoActualizado = await prisma.pagoAccesoRecurso.update({
      where: { id },
      data: { estadoPago: 'confirmado', confirmadoPor: req.user.id, fechaConfirmacion: new Date() },
      include: {
        acceso: {
          include: {
            usuario: { select: { id: true, nombre: true, apellido: true, email: true } },
            enlace: { select: { id: true, titulo: true } },
          },
        },
      },
    });

    await prisma.accesoRecurso.update({
      where: { id: pago.accesoId },
      data: { estado: 'activo' }
    });

    await prisma.notificacion.create({
      data: {
        usuarioId: pagoActualizado.acceso.usuario.id,
        tipo: 'acceso_confirmado',
        titulo: 'Acceso confirmado',
        mensaje: `Tu pago para acceder al recurso "${pagoActualizado.acceso.enlace.titulo}" fue confirmado. ¡Ya tienes acceso!`,
        leida: false,
      },
    });

    await registrarHistorial(req.user.id, 'CONFIRMAR_PAGO_RECURSO', pago.accesoId, `Pago confirmado: ref. ${pago.referencia}`, req.ip);
    res.json({ success: true, message: 'Pago confirmado y acceso otorgado', data: pagoActualizado });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al confirmar pago', error: error.message });
  }
};

const declinarPago = async (req, res) => {
  try {
    const id = parseInt(req.params.pagoId);
    const pago = await prisma.pagoAccesoRecurso.findUnique({
      where: { id },
      include: {
        acceso: {
          include: {
            usuario: { select: { id: true, nombre: true, apellido: true, email: true } },
            enlace: { select: { id: true, titulo: true } },
          },
        },
      },
    });
    if (!pago) return res.status(404).json({ success: false, message: 'Pago no encontrado' });
    if (pago.estadoPago !== 'pendiente') {
      return res.status(400).json({ success: false, message: 'Solo se pueden declinar pagos pendientes' });
    }

    const usuarioId = pago.acceso.usuario.id;
    const tituloRecurso = pago.acceso.enlace.titulo;

    await prisma.pagoAccesoRecurso.delete({ where: { id } });
    await prisma.accesoRecurso.delete({ where: { id: pago.accesoId } });

    await prisma.notificacion.create({
      data: {
        usuarioId,
        tipo: 'acceso_declinado',
        titulo: 'Solicitud de acceso declinada',
        mensaje: `Tu solicitud de acceso al recurso "${tituloRecurso}" fue declinada. Si tienes dudas, contáctanos directamente.`,
        leida: false,
      },
    });

    await registrarHistorial(req.user.id, 'DECLINAR_PAGO_RECURSO', pago.accesoId, `Acceso declinado a "${tituloRecurso}"`, req.ip);
    res.json({ success: true, message: 'Solicitud de acceso declinada' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al declinar acceso', error: error.message });
  }
};

const obtenerAccesos = async (req, res) => {
  try {
    const accesos = await prisma.accesoRecurso.findMany({
      where: { enlaceId: parseInt(req.params.id) },
      include: {
        usuario: { select: { id: true, nombre: true, apellido: true, email: true, telefono: true } },
        pago: { select: { estadoPago: true, referencia: true, monto: true } },
      },
      orderBy: { fechaSolicitud: 'desc' },
    });
    res.json({ success: true, data: accesos });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener accesos', error: error.message });
  }
};

module.exports = {
  obtenerEnlaces, obtenerEnlacePorId, crearEnlace, actualizarEnlace, toggleActivoEnlace,
  solicitarAcceso, obtenerMiPago, obtenerPagosPendientes, confirmarPago, declinarPago, obtenerAccesos,
};